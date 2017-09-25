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
  var endBlock;
  var gasUsed = 0;

  function indent () {
    return Array(indents).join('  ');
  }

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

  runner.on('test', function() {
    startBlock = web3.eth.blockNumber + 1;
  });

  runner.on('pending', function (test) {
    var fmt = indent() + color('pending', '  - %s');
    console.log(fmt, test.title);
  });

  runner.on('pass', function (test) {
    var fmt;

    gasUsed = 0;
    endBlock = web3.eth.blockNumber;
    while(startBlock <= endBlock){
      var block = web3.eth.getBlock(startBlock);
      
      if (block)
        gasUsed += block.gasUsed;

      startBlock++;
    }
    
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
    console.log(indent() + color('fail', '  %d) %s'), ++n, test.title);
  });

  runner.on('end', self.epilogue.bind(self));
}

/**
 * Inherit from `Base.prototype`.
 */
inherits(Spec, Base);