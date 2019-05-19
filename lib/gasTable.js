const colors = require('colors/safe')
const _ = require('lodash')
const fs = require('fs')
const Table = require('cli-table3')
const utils = require('./utils');

class GasTable {
  constructor(config){
    this.config = config;
  }
  /**
   * Formats and prints a gas statistics table. Optionally writes to a file.
   * Based on Alan Lu's stats for Gnosis
   * @param  {Object} info   GasData instance with `methods` and `deployments` data
   * @param  {[type]} config reporter config
   */
  generate(info) {
    const self = this;
    colors.enabled = !self.config.noColors || false

    // ---------------------------------------------------------------------------------------------
    // Assemble table section: methods
    // ---------------------------------------------------------------------------------------------
    const methodRows = [];

    _.forEach(info.methods, (data, methodId) => {
      if (!data) return

      let stats = {}

      if (data.gasData.length) {
        const total = data.gasData.reduce((acc, datum) => acc + datum, 0)
        stats.average = Math.round(total / data.gasData.length)

        stats.cost = (self.config.ethPrice && self.config.gasPrice)
          ? utils.gasToCost(stats.average, self.config.ethPrice, self.config.gasPrice)
          : colors.grey('-')

      } else {
        stats.average = colors.grey('-')
        stats.cost = colors.grey('-')
      }

      const sortedData = data.gasData.sort((a, b) => a - b)
      stats.min = sortedData[0]
      stats.max = sortedData[sortedData.length - 1]

      const uniform = (stats.min === stats.max)
      stats.min = (uniform) ? '-' : colors.cyan(stats.min.toString())
      stats.max = (uniform) ? '-' : colors.red(stats.max.toString())

      stats.numberOfCalls = colors.grey(data.numberOfCalls.toString())

      if (!self.config.onlyCalledMethods || data.numberOfCalls > 0) {
        const section = []
        section.push(colors.grey(data.contract))
        section.push(data.method)
        section.push({hAlign: 'right', content: stats.min})
        section.push({hAlign: 'right', content: stats.max})
        section.push({hAlign: 'right', content: stats.average})
        section.push({hAlign: 'right', content: stats.numberOfCalls})
        section.push({hAlign: 'right', content: colors.green(stats.cost.toString())})

        methodRows.push(section)
      }
    })

    // ---------------------------------------------------------------------------------------------
    // Assemble table section: deployments
    // ---------------------------------------------------------------------------------------------
    const deployRows = []

    // Alphabetize contract names
    info.deployments.sort((a, b) => a.name.localeCompare(b.name))

    info.deployments.forEach(contract => {
      let stats = {}
      if (!contract.gasData.length) return

      const total = contract.gasData.reduce((acc, datum) => acc + datum, 0)
      stats.average = Math.round(total / contract.gasData.length)
      stats.percent = utils.gasToPercentOfLimit(stats.average, self.config.blockLimit)

      stats.cost = (self.config.ethPrice && self.config.gasPrice)
        ? utils.gasToCost(stats.average, self.config.ethPrice, self.config.gasPrice)
        : colors.grey('-');

      const sortedData = contract.gasData.sort((a, b) => a - b)
      stats.min = sortedData[0]
      stats.max = sortedData[sortedData.length - 1]

      const uniform = (stats.min === stats.max)
      stats.min = (uniform) ? '-' : colors.cyan(stats.min.toString())
      stats.max = (uniform) ? '-' : colors.red(stats.max.toString())

      const section = []
      section.push({hAlign: 'left', colSpan: 2, content: contract.name})
      section.push({hAlign: 'right', content: stats.min})
      section.push({hAlign: 'right', content: stats.max})
      section.push({hAlign: 'right', content: stats.average})
      section.push({hAlign: 'right', content: colors.grey(`${stats.percent} %`)})
      section.push({hAlign: 'right', content: colors.green(stats.cost.toString())})

      deployRows.push(section)
    })

    // ---------------------------------------------------------------------------------------------
    // Assemble table section: headers
    // ---------------------------------------------------------------------------------------------

    // Configure indentation for RTD
    const leftPad = (self.config.rst) ? '  ' : '';

    // Format table
    const table = new Table({
      style: {head: [], border: [], 'padding-left': 2, 'padding-right': 2},
      chars: {
        'mid': '·', 'top-mid': '|', 'left-mid': `${leftPad}·`, 'mid-mid': '|', 'right-mid': '·',
        'left': `${leftPad}|`, 'top-left': `${leftPad}·`, 'top-right': '·',
        'bottom-left': `${leftPad}·`, 'bottom-right': '·', 'middle': '·', 'top': '-',
        'bottom': '-', 'bottom-mid': '|'
      }
    })

    // Format and load methods metrics
    let title = [
      {hAlign: 'center', colSpan: 5, content: colors.green.bold('Gas')},
      {hAlign: 'center', colSpan: 2, content: colors.grey(`Block limit: ${info.blockLimit} gas`)}
    ]

    let methodSubtitle
    if (self.config.ethPrice && self.config.gasPrice) {
      const gwei = parseInt(self.config.gasPrice)
      const rate = parseFloat(self.config.ethPrice).toFixed(2)
      const currency = `${self.config.currency.toLowerCase()}`

      methodSubtitle = [
        {hAlign: 'left', colSpan: 2, content: colors.green.bold('Methods')},
        {hAlign: 'center', colSpan: 3, content: colors.grey(`${gwei} gwei/gas`)},
        {hAlign: 'center', colSpan: 2, content: colors.red(`${currency}/eth`)}
      ]
    } else {
      methodSubtitle = [{hAlign: 'left', colSpan: 7, content: colors.green.bold('Methods')}]
    }

    const header = [
      colors.bold('Contract'),
      colors.bold('Method'),
      colors.green('Min'),
      colors.green('Max'),
      colors.green('Avg'),
      colors.bold('# calls'),
      colors.bold(`${self.config.currency.toLowerCase()} (avg)`)
    ]

    // ---------------------------------------------------------------------------------------------
    // Final assembly
    // ---------------------------------------------------------------------------------------------
    table.push(title)
    table.push(methodSubtitle)
    table.push(header)


    methodRows.sort((a, b) => {
      const contractName = a[0].localeCompare(b[0])
      const methodName = a[1].localeCompare(b[1])
      return contractName || methodName
    })

    methodRows.forEach(row => table.push(row))

    if (deployRows.length) {
      const deploymentsSubtitle = [
        {hAlign: 'left', colSpan: 2, content: colors.green.bold('Deployments')},
        {hAlign: 'right', colSpan: 3, content: '' },
        {hAlign: 'left', colSpan: 1, content: colors.bold(`% of limit`)}
      ]
      table.push(deploymentsSubtitle)
      deployRows.forEach(row => table.push(row))
    }

    // ---------------------------------------------------------------------------------------------
    // RST / ReadTheDocs / Sphinx output
    // ---------------------------------------------------------------------------------------------
    let rstOutput = '';
    if (self.config.rst) {
      rstOutput += `${self.config.rstTitle}\n`;
      rstOutput += `${'='.repeat(self.config.rstTitle.length)}\n\n`;
      rstOutput += `.. code-block:: shell\n\n`;
    }

    let tableOutput = rstOutput + table.toString();

    // ---------------------------------------------------------------------------------------------
    // Print
    // ---------------------------------------------------------------------------------------------
    (self.config.outputFile)
      ? fs.writeFileSync(outputFile, tableOutput)
      : console.log(tableOutput)
  }
}

module.exports = GasTable;
