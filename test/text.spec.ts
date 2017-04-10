

import {createElement as h, text, render, WitnessElement} from '../src/index'
import xs from 'xstream'
import * as Color from 'color'

describe('text', () => {
  let rootElement: HTMLElement
  let root: { unmount (): void }
  const assert = chai.assert

  beforeEach(() => {
    rootElement = document.createElement('div')
  })

  afterEach(() => {
    root.unmount()
  })

  it('should set the text of the root node correctly', () => {
    const sampleText = 'text'
    root = render(text(sampleText), rootElement)

    assert.equal(rootElement.textContent, sampleText)
  })

  it('should set the text of a nested node correctly', () => {
    const sampleText = 'text'
    root = render(h('div', [text(sampleText)]), rootElement)

    assert.equal(rootElement.textContent, sampleText)
  })

  it('should respond to observed changes in the text', () => {
    const sampleText_ = xs.create()
    root = render(h('div', [text(sampleText_)]), rootElement)

    const sampleTexts = ['test', 'stop', 'start', 'isWorking?', 5, 666]

    sampleTexts.forEach(sampleText => {
      sampleText_.shamefullySendNext(sampleText)
      assert.equal(rootElement.textContent, sampleText)
    })
  })
})