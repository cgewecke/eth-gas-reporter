const _ = require("lodash");
const fs = require("fs");
const Table = require("cli-table3");
const utils = require("./utils");

class CodeChecksReport {
  constructor(config) {
    this.config = config;
    this.increases = 0;
    this.decreases = 0;
    this.reportIsNew = true;

    this.previousData = config.previousData || { methods: {}, deployments: {} };
    this.newData = { methods: {}, deployments: {} };
  }

  /**
   * Generates a gas usage difference report for CodeCheck
   * @param  {Object} info   GasData instance with `methods` and `deployments` data
   */
  generate(info) {
    let highlighting;
    const pad = "  ";
    const addedContracts = [];

    // ---------------------------------------------------------------------------------------------
    // Assemble section: methods
    // ---------------------------------------------------------------------------------------------
    const methodRows = [];

    _.forEach(info.methods, (data, methodId) => {
      if (!data) return;

      let stats = {};

      if (data.gasData.length) {
        const total = data.gasData.reduce((acc, datum) => acc + datum, 0);
        stats.average = Math.round(total / data.gasData.length);

        stats.cost =
          this.config.ethPrice && this.config.gasPrice
            ? utils.gasToCost(
                stats.average,
                this.config.ethPrice,
                this.config.gasPrice
              )
            : "-";
      }

      stats.diff = this.getMethodDiff(methodId, stats.average);
      stats.percentDiff = this.getMethodDiff(methodId, stats.average);

      highlighting = this.getHighlighting(stats.diff);

      if (data.numberOfCalls > 0) {
        // Contracts name row
        if (!addedContracts.includes(data.contract)) {
          addedContracts.push(data.contract);

          const titleSection = [];
          titleSection.push({
            hAlign: "left",
            colSpan: 2,
            content: `${pad}> ${data.contract}`,
            contractName: data.contract,
            methodName: "0"
          });

          titleSection.push({ colSpan: 5, content: "" });

          methodRows.push(titleSection);
        }

        // Method row
        const methodSection = [];
        methodSection.push({
          hAlign: "left",
          colSpan: 2,
          content: `${highlighting}${pad}${pad}${data.method}`,
          contractName: data.contract,
          methodName: data.method
        });
        methodSection.push({
          hAlign: "right",
          content: `${pad}${stats.average}`
        });
        methodSection.push({ hAlign: "right", content: stats.diff });
        methodSection.push({ hAlign: "right", content: stats.percentDiff });
        methodSection.push({
          hAlign: "right",
          content: data.numberOfCalls.toString()
        });
        methodSection.push({
          hAlign: "right",
          content: stats.cost.toString()
        });

        methodRows.push(methodSection);
        this.newData.methods[methodId] = stats.average;
      }
    });

    // ---------------------------------------------------------------------------------------------
    // Assemble section: deployments
    // ---------------------------------------------------------------------------------------------
    const deployRows = [];

    // Alphabetize contract names
    info.deployments.sort((a, b) => a.name.localeCompare(b.name));

    info.deployments.forEach(contract => {
      let stats = {};
      if (!contract.gasData.length) return;

      const total = contract.gasData.reduce((acc, datum) => acc + datum, 0);
      stats.average = Math.round(total / contract.gasData.length);
      stats.percent = utils.gasToPercentOfLimit(stats.average, info.blockLimit);

      stats.cost =
        this.config.ethPrice && this.config.gasPrice
          ? utils.gasToCost(
              stats.average,
              this.config.ethPrice,
              this.config.gasPrice
            )
          : "-";

      stats.diff = this.getDeploymentDiff(contract.name, stats.average);
      stats.percentDiff = this.getDeploymentPercentageDiff(
        contract.name,
        stats.average
      );
      highlighting = this.getHighlighting(stats.diff);

      const section = [];
      section.push({
        hAlign: "left",
        colSpan: 2,
        content: `${highlighting}${contract.name}`
      });
      section.push({ hAlign: "right", content: `${pad}${stats.average}` });
      section.push({ hAlign: "right", content: stats.diff });
      section.push({ hAlign: "right", content: stats.percentDiff });

      section.push({
        hAlign: "right",
        content: `${stats.percent} %`
      });
      section.push({
        hAlign: "right",
        content: stats.cost.toString()
      });

      deployRows.push(section);
      this.newData.deployments[contract.name] = stats.average;
    });

    // ---------------------------------------------------------------------------------------------
    // Assemble section: headers
    // ---------------------------------------------------------------------------------------------

    // Format table
    const table = new Table({
      style: { head: [], border: [], "padding-left": 0, "padding-right": 2 },
      chars: {
        "top-mid": "|",
        "bottom-mid": "|",
        "left-mid": "",
        "mid-mid": "|",
        "right-mid": "·",
        "top-left": "",
        "top-right": "·",
        "bottom-left": "",
        "bottom-right": "·",
        mid: "·",
        middle: "·",
        left: "",
        right: "",
        top: ".",
        bottom: "."
      }
    });

    // Format and load methods metrics
    const solc = utils.getSolcInfo(this.config.metadata);

    let title = [
      {
        hAlign: "center",
        colSpan: 2,
        content: `Solc: v${solc.version.split("+")[0]}`
      },
      {
        hAlign: "center",
        colSpan: 3,
        content: ` Optimized: ${solc.optimizer} / ${pad}Runs: ${solc.runs}`
      },
      {
        hAlign: "center",
        colSpan: 2,
        content: `Block: ${info.blockLimit} gas`
      }
    ];

    let methodSubtitle;
    if (this.config.ethPrice && this.config.gasPrice) {
      const gwei = parseInt(this.config.gasPrice);
      const rate = parseFloat(this.config.ethPrice).toFixed(2);
      const currency = `${this.config.currency.toLowerCase()}`;

      methodSubtitle = [
        { hAlign: "left", colSpan: 2, content: `${pad}METHODS` },
        {
          hAlign: "center",
          colSpan: 3,
          content: `${gwei} gwei/gas`
        },
        {
          hAlign: "center",
          colSpan: 2,
          content: `${rate} ${currency}/eth`
        }
      ];
    } else {
      methodSubtitle = [{ hAlign: "left", colSpan: 7, content: `METHODS` }];
    }

    const header = [
      {},
      {},
      { hAlign: "center", content: `${pad}Gas` },
      { hAlign: "center", content: `${pad}Diff` },
      { hAlign: "center", content: `${pad}% Diff` },
      `${pad}calls`,
      `${pad}${this.config.currency.toLowerCase()} cost`
    ];

    // ---------------------------------------------------------------------------------------------
    // Final assembly
    // ---------------------------------------------------------------------------------------------
    table.push(title);
    table.push(methodSubtitle);
    table.push(header);

    methodRows.sort((a, b) => {
      // Ignore diff markers
      const contractName = a[0].contractName.localeCompare(b[0].contractName);
      const methodName = a[0].methodName.localeCompare(b[0].methodName);
      return contractName || methodName;
    });

    methodRows.forEach(row => table.push(row));

    if (deployRows.length) {
      const deploymentsSubtitle = [
        {
          hAlign: "left",
          colSpan: 2,
          content: `${pad}DEPLOYMENTS`
        },
        { hAlign: "right", colSpan: 3, content: "" },
        { hAlign: "left", colSpan: 1, content: `${pad}% block` }
      ];
      table.push(deploymentsSubtitle);
      deployRows.forEach(row => table.push(row));
    }

    // ---------------------------------------------------------------------------------------------
    // Finish
    // ---------------------------------------------------------------------------------------------
    return "\n```diff\n" + table.toString() + "\n```";
  }

  getDiff(previousVal, currentVal) {
    if (typeof previousVal === "number") {
      const diff = currentVal - previousVal;

      if (diff > 0) this.increases++;
      if (diff < 0) this.decreases++;

      this.reportIsNew = false;
      return diff;
    }
    return "-";
  }

  getPercentageDiff(previousVal, currentVal) {
    if (typeof previousVal === "number") {
      const diff = currentVal - previousVal;
      return `${math.round((diff / previous) * 100)}%`;
    }
    return "-";
  }

  getMethodDiff(id, currentVal) {
    return this.getDiff(this.previousData.methods[id], currentVal);
  }

  getMethodPercentageDiff(id, currentVal) {
    return this.getPercentageDiff(this.previousData.methods[id], currentVal);
  }

  getDeploymentDiff(id, currentVal) {
    return this.getDiff(this.previousData.deployments[id], currentVal);
  }

  getDeploymentPercentageDiff(id, currentVal) {
    return this.getPercentageDiff(
      this.previousData.deployments[id],
      currentVal
    );
  }

  getHighlighting(val) {
    if (val > 0) return "- "; // Current use greater: red
    if (val < 0) return "+ "; // Current use less: green
    return "  ";
  }

  getShortDescription() {
    const increasesItem = this.increases === 1 ? "item" : "items";
    const decreasesItem = this.decreases === 1 ? "item" : "items";

    if (this.increases > 0 && this.decreases > 0) {
      return (
        `Gas usage increased for ${this.increases} ${increasesItem} and ` +
        `decreased for ${this.decreases} ${decreasesItem}`
      );
    } else if (this.increases > 0) {
      return `Gas usage increased for ${this.increases} ${increasesItem}`;
    } else if (this.decreases > 0) {
      return `Gas usage decreased for ${this.decreases} ${decreasesItem}`;
    } else if (this.reportIsNew) {
      return `New gas usage report!`;
    } else {
      return `Gas usage remained the same`;
    }
  }
}

module.exports = CodeChecksReport;
