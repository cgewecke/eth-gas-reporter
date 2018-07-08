const DuplicateFunctionA = artifacts.require('DuplicateFunctionA');
const DuplicateFunctionB = artifacts.require('DuplicateFunctionB');

contract('MultiContractFiles', accounts => {
  let a
  let b

  beforeEach(async function () {
    a = await DuplicateFunctionA.new()
    b = await DuplicateFunctionB.new()
  })

  it('a.dupFunc()', async function(){
    await a.dupFunc();
  })

  it('b.dupFunc()', async function(){
    await b.dupFunc();
  })
});