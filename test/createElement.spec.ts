
import {createElement as h, render, WitnessElement} from '../src/index'
import xs from 'xstream'
import * as Color from 'color'

describe('createElement', () => {
  let rootElement: HTMLElement
  let root: { unmount (): void }
  const assert = chai.assert

  beforeEach(() => {
    rootElement = document.createElement('div')
  })

  afterEach(() => {
    root.unmount()
  })

  it('should mount an element with correct tag', () => {
    root = render(h('i'), rootElement)
    assert.equal(rootElement.children[0].tagName.toLowerCase(), 'i')
  })

  it('should mount it\'s chlidren', () => {
    const tree = h('div', [
      h('div'),
      h('div'),
      h('div'),
      h('div')
    ])
    root = render(tree, rootElement)
    assert.equal(rootElement.children[0].children.length, 4)
  })

  it('should set the correct styles', () => {
    const style = {
      backgroundColor: 'green',
      display: 'inline-block',
      color: 'red',
      backfaceVisibility: 'none'
    }

    const tree = h('div', {style})
    root = render(tree, rootElement)

    Object.keys(style).forEach(key => {
      assert.propertyVal((rootElement.children[0] as any).style, key, (style as any)[key])
    })
  })

  it('should set the correct properties', () => {
    const props = {
      id: 'test',
      value: 'test'
    }

    const tree = h('input', props)
    root = render(tree, rootElement)

    Object.keys(props).forEach(key => {
      assert.propertyVal((rootElement.children[0] as any), key, (props as any)[key])
    })
  })

  it('should respond to observed style changes', () => {
    const stream = xs.create()
    const tree = h('div', {style: {backgroundColor: stream}})
    root = render(tree, rootElement)
    const getBG = () => Color((rootElement.children[0] as HTMLElement).style.backgroundColor as string)

    const colors = ['#fff', '#000', '#efefef', 'red', 'green']

    colors.forEach(color => {
      stream.shamefullySendNext(color)
      assert.deepEqual(getBG(), Color(color))
    })
  })

  it('should respond to observed property changes', () => {
    const stream = xs.create()
    const tree = h('input', {value: stream})
    root = render(tree, rootElement)
    const getValue = () => (rootElement.children[0] as HTMLInputElement).value

    const values = ['yoy', 'hay', 'whethuetuhetuheu', 'cant tocuh this', 555]

    values.forEach(value => {
      stream.shamefullySendNext(value)
      assert.equal(getValue(), String(value))
    })
  })
})
