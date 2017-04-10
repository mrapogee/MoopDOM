
import {createElement as h, cond, otherwise, text, render, WitnessElement} from '../src/index'
import xs from 'xstream'
import * as Color from 'color'

describe('switchOn', () => {
  let rootElement: HTMLElement
  let root: { unmount (): void }
  const assert = chai.assert

  beforeEach(() => {
    rootElement = document.createElement('div')
  })

  afterEach(() => {
    root.unmount()
  })

  it('should toggle between branches on observed changes', () => {
    const stream = xs.create()

    const tree = cond(stream,
      [true, text('hello')],
      [false, text('bye')],
    )
    root = render(tree, rootElement)

    assert.equal(rootElement.textContent, '')

    stream.shamefullySendNext(true)
    assert.equal(rootElement.textContent, 'hello')

    stream.shamefullySendNext(false)
    assert.equal(rootElement.textContent, 'bye')

    stream.shamefullySendNext(true)
    assert.equal(rootElement.textContent, 'hello')
  })

  it('should default to the otherwise case', () => {
    const stream = xs.of('test')
    const tree = cond(stream,
      [() => false, text('never')],
      [otherwise, text('always')],
    )
    root = render(tree, rootElement)

    assert.equal(rootElement.textContent, 'always')
  })

  it('should pass the item to the predicates', () => {
    const stream = xs.of('rando')
    const tree = cond(stream,
      [(v) => v === 'rando', text('should')],
      [otherwise, text('should not')],
    )
    root = render(tree, rootElement)

    assert.equal(rootElement.textContent, 'should')
  })

  it('should resolve to the first of many true', () => {
    const stream = xs.of('rando')
    const tree = cond(stream,
      [(v) => v === 'rando', text('should')],
      [(v) => v === 'rando', text('should not')],
      [(v) => v === 'rando', text('should never')],
      [(v) => v === 'rando', text('should not ever')],
      [otherwise, text('shan\'t')],
    )
    root = render(tree, rootElement)

    assert.equal(rootElement.textContent, 'should')
  })
})
