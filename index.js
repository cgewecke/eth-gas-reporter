const mocha = require('mocha');
const inherits = require('util').inherits;
const Base = mocha.reporters.Base;
const color = Base.color;
const log = console.log;
module.exports = Gas;

// Based on the 'Spec' reporter
function Gas (runner) {
  Base.call(this, runner);

  const self = this;
  let indents = 0;
  let n = 0;
  let startBlock;

  // ------------------------------------  Helpers -------------------------------------------------
  const indent = () => Array(indents).join('  ');

  const calculateGasUsed = () => {
    let gasUsed = 0;
    const endBlock = web3.eth.blockNumber;
    while(startBlock <= endBlock){
      let block = web3.eth.getBlock(startBlock);
      if (block)
        gasUsed += block.gasUsed;

      startBlock++;
    }
    return gasUsed;
  };

  // ------------------------------------  Runners -------------------------------------------------
  runner.on('start', () => {
    log()
  });

  runner.on('suite', suite => {
    ++indents;
    log(color('suite', '%s%s'), indent(), suite.title);
  });

  runner.on('suite end', () => {
    --indents;
    if (indents === 1) {
      log();
    }
  });

  runner.on('pending', test => {
    let fmt = indent() + color('pending', '  - %s');
    log(fmt, test.title);
  });

  runner.on('hook end', () => { startBlock = web3.eth.blockNumber + 1 })

  runner.on('pass', test => {
    let fmt;
    let gasUsed = calculateGasUsed();

    if (test.speed === 'fast') {
      fmt = indent() +
        color('checkmark', '  ' + Base.symbols.ok) +
        color('pass', ' %s')+
        color('checkmark', ' (%d gas)');
      log(fmt, test.title, gasUsed);
    } else {
      fmt = indent() +
        color('checkmark', '  ' + Base.symbols.ok) +
        color('pass', ' %s') +
        color(test.speed, ' (%dms)') +
        color('checkmark', ' (%d gas)');
      log(fmt, test.title, test.duration, gasUsed);
    }
  });

  runner.on('fail', test => {
    let gasUsed = calculateGasUsed();
    let fmt = indent() +
      color('fail', '  %d) %s') +
      color('pass', ' (%d gas)');
    log()
    log(fmt, ++n, test.title, gasUsed);
  });

  runner.on('end', () => {
    self.epilogue.bind(self);

  });
}

/**
 * Inherit from `Base.prototype`.
 */
inherits(Gas, Base);