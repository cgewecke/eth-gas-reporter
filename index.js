var mocha = require('mocha');
var inherits = require('util').inherits;
var Base = mocha.reporters.Base;
var color = Base.color;

module.exports = Gas;

// Based on 'Spec'. Please smoke outside while running your suite. For safety.
function Gas (runner) {
  Base.call(this, runner);

  var self = this;
  var indents = 0;
  var n = 0;
  var startBlock;

  function indent () {
    return Array(indents).join('  ');
  }

  function calculateGasUsed(){
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

  runner.on('start', function () {
    console.log();
  });

  runner.on('suite', function (suite) {
    ++indents;
    console.log(color('suite', '%s%s'), indent(), suite.title);
  });

  runner.on('suite end', function () {
    --indents;
    if (indents === 1) {
      console.log();
    }
  });

  runner.on('hook end', function () {
    startBlock = web3.eth.blockNumber + 1;
  })

  runner.on('test', function() {});

  runner.on('pending', function (test) {
    var fmt = indent() + color('pending', '  - %s');
    console.log(fmt, test.title);
  });

  runner.on('pass', function (test) {
    let fmt;
    let gasUsed = calculateGasUsed();
    
    if (test.speed === 'fast') {
      fmt = indent() +
        color('checkmark', '  ' + Base.symbols.ok) +
        color('pass', ' %s')+
        color('checkmark', ' (%d gas)');
      console.log(fmt, test.title, gasUsed);
    } else {
      fmt = indent() +
        color('checkmark', '  ' + Base.symbols.ok) +
        color('pass', ' %s') +
        color(test.speed, ' (%dms)') +
        color('checkmark', ' (%d gas)');
      console.log(fmt, test.title, test.duration, gasUsed);
    }
  });

  runner.on('fail', function (test) {
    let gasUsed = calculateGasUsed();
    let fmt = indent() +
      color('fail', '  %d) %s') +
      color('pass', ' (%d gas)');
      console.log()

    console.log(fmt, ++n, test.title, gasUsed);
  });

  runner.on('end', self.epilogue.bind(self));
}

/**
 * Inherit from `Base.prototype`.
 */
inherits(Gas, Base);