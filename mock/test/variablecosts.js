const VariableCosts = artifacts.require('./VariableCosts.sol')

contract('VariableCosts', accounts => {
  const one = [1]
  const three = [2, 3, 4]
  const five = [5, 6, 7, 8, 9]
  let instance

  beforeEach(async () => instance = await VariableCosts.new())

  it('should add one', async () => {
    await instance.addToMap(one)
  })

  it('should add three', async () => {
    await instance.addToMap(three)
  })

  it('should add even 5!', async () => {
    await instance.addToMap(five)
  })

  it('should delete one', async() => {
    await instance.removeFromMap(one)
  })

  it('should delete three', async() => {
    await instance.removeFromMap(three)
  })

  it('should delete five', async() => {
    await instance.removeFromMap(five)
  })

  it('should add five and delete one', async() => {
    await instance.addToMap(five)
    await instance.removeFromMap(one)
  })

  it('methods that do not throw', async() => {
    await instance.methodThatThrows(false)
  })

  it('methods that throw', async() => {
    try { await instance.methodThatThrows(true) } catch (e) {}
  })

  it('prints a table at end of test suites with failures', async() => {
    assert(false);
  })
})
