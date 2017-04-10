
import {getPlaceholderNode, returnPlaceholderNode} from './recycle'
import xstream from 'xstream'
import * as assert from 'assert'

interface Listener<V> {
  next (event: V): void
  error (event: any): void
  complete (): void
}

interface Subject<V> {
  event (event: V): void
  error (event: any): void
  end (): void
}

interface Subscription {
  unsubscribe (): void
}

const unsubscribe = (subscriptions: Subscription | Subscription[]) => {
  if (Array.isArray(subscriptions)) {
    for (let i = 0; i < subscriptions.length; i++) {
      subscriptions[i].unsubscribe()
    }
  } else {
    subscriptions.unsubscribe()
  }
}

interface Observable<V> {
  subscribe(listener: Listener<V>): Subscription
}

abstract class BaseListener<T> implements Listener<T> {
  abstract next (e: T): void
  error (e: any) { console.error(e) }
  complete () {}
}

type PartialObservable<T> = {[K in keyof T]: T[K] | Observable<T[K]>}

type DOMProps = PartialObservable<{[k: string]: any}>
export type WitnessProps = {style?: PartialObservable<CSSStyleDeclaration>} & DOMProps

interface Slot {
  set (el: Node): void
  empty (): void
  ensure (): void
}

export interface WitnessElement {
  mount (slot: Slot): void
  unmount (): void
}

class InternalWitnessSubject {
  mounted (element: HTMLElement) {}
  unmounted () {}
}

interface WitnessSubject {}

class SetStyleListener extends BaseListener<string> {
  constructor (
    public el: StaticStructureElement,
    public prop: keyof CSSStyleDeclaration
  ) { super() }

  next (value: string) {
    this.el.element.style[this.prop as any] = value
  }
}

class SetPropertyListener extends BaseListener<string> {
  constructor (
    public el: StaticStructureElement,
    public key: string
  ) { super() }

  next (value: string) {
    ;(this.el.element as any)[this.key as any] = value
  }
}

class StaticChildSlot implements Slot {
  node: Node
  placeholder: boolean = false

  constructor (public parent: HTMLElement) {}

  set (node: Node) {
    const oldNode = this.node
    if (this.node == null) {
      this.parent.appendChild(node)
      this.node = node
    } else {
      this.replace(node)
    }

    if (this.placeholder) {
      returnPlaceholderNode(oldNode)
      this.placeholder = false
    }
  }

  private replace(newNode: Node) {
    this.parent.replaceChild(newNode, this.node)
    this.node = newNode
  }

  // Ensure slot is full to prevent nodes out of order
  empty () {
    if (!this.placeholder) {
      const node = getPlaceholderNode()
      if (this.node == null) {
        this.parent.appendChild(node)
        this.node = node
      } else {
        this.replace(node)
      }
      this.placeholder = true
    }
  }

  ensure ()  {
    if (this.node == null) {
      this.empty()
    }
  }
}

class MultiSlot {
  public end = getPlaceholderNode()
  public length = 0
  public children: [ElementSlot, WitnessElement][] = []

  constructor (slot: Slot) {
    const {end} = this
    slot.set(this.end)
  }

  insert (index: number, element: WitnessElement) {
    const {children} = this
    assert(index > children.length, 'Must insert elements in order')
    if (index === children.length) {
      children.push([new ElementSlot(this.end.parentNode as HTMLElement, this.end), element])
    }

    const slot = children[index]
    slot[1] = element

    element.mount(slot[0])
    slot[0].ensure()
  }

  removeSelf () {
    const parent = this.end.parentElement as HTMLElement
    parent.removeChild(this.end)
    returnPlaceholderNode(this.end)

    delete this.end
  }

  remove (index: number, element: WitnessElement) {
    const [slot, oldElement] = this.children[index]
    element.unmount()

    if (oldElement === element) {
      slot.remove()
    }

    this.children.splice(index, 1)
  }
}

class ElementSlot implements Slot {
  node: Node
  placeholder: boolean = false

  constructor (public parent: HTMLElement, public end: Node) {}

  set (node: Node) {
    const oldNode = this.node

    if (this.node == null) {
      this.parent.insertBefore(node, this.end)
      this.node = node
    } else {
      this.replace(node)
    }

    if (this.placeholder) {
      returnPlaceholderNode(oldNode)
      this.placeholder = false
    }
  }

  private replace(newNode: Node) {
    this.parent.replaceChild(newNode, this.node)
  }

  // Ensure slot is full to prevent nodes out of order
  empty () {
    if (!this.placeholder) {
      const node = getPlaceholderNode()
      if (this.node == null) {
        this.parent.insertBefore(node, this.end)
        this.node = node
      } else {
        this.replace(node)
      }
      this.placeholder = true
    }
  }

  ensure ()  {
    if (this.node == null) {
      this.empty()
    }
  }

  remove () {
    if (this.node != null) {
      const parent = this.parent.removeChild(this.node)
      if (this.placeholder) {
        returnPlaceholderNode(this.node)
      }
      delete this.node
    }
  }
}

class StaticStructureElement implements WitnessElement {
  public element: HTMLElement
  public subscriptions: Subscription[] = []
  public slot: Slot

  constructor (
    public tag: string,
    public props?: WitnessProps,
    public children?: WitnessElement[],
    public subject?: InternalWitnessSubject
  ) {}

  mount (slot: Slot) {
    this.slot = slot
    this.element = document.createElement(this.tag as any)

    if (this.props != null) {
      if (this.props.style != null) {
        this.mountStyles(this.props.style)
      }

      this.mountProps(this.props)
    }

    if (this.children != null) {
      this.mountChildren(this.children)
    }

    this.slot.set(this.element)

    if (this.subject != null) {
      this.subject.mounted(this.element)
    }
  }

  private mountChildren (children: WitnessElement[]) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const slot = new StaticChildSlot(this.element)
      child.mount(slot)

      // Ensure slot is full to prevent mis-ordering
      slot.ensure()
    }
  }

  private mountProps (props: WitnessProps) {
    // TODO: we can use store these to enable DOMRecycling
    const keys = Object.keys(props)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (key !== 'style') {
        const value = props[keys[i]]

        if (typeof value === 'object') {
          this.subscriptions.push(value.subscribe(new SetPropertyListener(this, key)))
        } else {
          ;(this.element as any)[key] = value
        }
      }
    }
  }

  private mountStyles (styles: PartialObservable<CSSStyleDeclaration>) {
    const keys = Object.keys(styles) as (keyof CSSStyleDeclaration)[]

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const value = styles[key] as Observable<string> | string

      if (typeof value === 'object') {
        this.subscriptions.push(value.subscribe(new SetStyleListener(this, key)))
      } else {
        this.element.style[key as any] = value
      }
    }
  }

  unmount () {
    this.slot.empty()
    delete this.slot
    unsubscribe(this.subscriptions)
    delete this.subscriptions

    // TODO: empty and recycle?
    delete this.element

    if (this.subject != null) {
      this.subject.unmounted()
    }
  }
}

class ListElement<T, S extends Observable<T>> extends BaseListener<T[]> implements WitnessElement {
  private keyedChildren: ({[key: string]: [WitnessElement, Subject<T>, number]})
  private slot: MultiSlot

  constructor (
    private createKey: (item: T) => string,
    private list_: Observable<T[]>,
    private createElement: (item: S) => WitnessElement,
    private createSubject: (item: T) => [Subject<T>, S]
  ) { super() }

  mount (slot: Slot) {
    this.slot = new MultiSlot(slot)
  }

  unmount () {
    const keys = Object.keys(this.keyedChildren)

    for (let i = 0; i < keys.length; i++) {
      const [element, subject, index] = this.keyedChildren[keys[i]]
      this.slot.remove(index, element)
      subject.end()
    }

    this.slot.removeSelf()
    delete this.slot
  }

  next (list: T[]) {
    const missing = new Set(Object.keys(this.keyedChildren))

    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      const key = this.createKey(item)
      missing.delete(key)

      if (this.keyedChildren[key] == null) {
        const [subject, observable] = this.createSubject(item)
        const element = this.createElement(observable)
        this.slot.insert(i, element)
        this.keyedChildren[key] = [element, subject, i]
      } else {
        const [_, subject] = this.keyedChildren[key]
        subject.event(item)
      }
    }

    for (const key in missing) {
      const [element, subject, i] = this.keyedChildren[key]
      this.slot.remove(i, element)
      subject.end()
    }
  }
}

class CaseElement<T> extends BaseListener<T> implements WitnessElement {
  private slot: Slot
  private subscription: Subscription
  private child: WitnessElement

  constructor (
    private value: Observable<T>,
    private cases: [T | ((v: T) => boolean), WitnessElement][]
  ) { super() }

  mount (slot: Slot) {
    this.slot = slot
    this.subscription = this.value.subscribe(this)
  }

  unmount () {
    unsubscribe(this.subscription)
    delete this.subscription
    this.slot.empty()
  }

  next (v: T) {
    const {cases} = this
    for (let i = 0; i < cases.length; i++) {
      const [predicate, result] = cases[i]
      if (predicate instanceof Function) {
        if (predicate(v)) {
          this.setChild(result)
          return
        }
      } else {
        if (predicate === v) {
          this.setChild(result)
          return
        }
      }
    }
  }

  private setChild (el: WitnessElement) {
    if (this.child != null) {
      this.child.unmount()
    }

    el.mount(this.slot)
    this.child = el
  }
}

class EmptyElement {
  mount (slot: Slot) {}
  unmount () {}
}

class TextElement extends BaseListener<string> implements WitnessElement {
  textNode: Text
  slot: Slot

  constructor (public text: string | Observable<string>) {
    super()
  }

  mount (slot: Slot) {
    this.slot = slot
    const {text} = this
    this.textNode = document.createTextNode('')
    this.slot.set(this.textNode)

    if (typeof text === 'string') {
      this.setText(text)
    } else {
      text.subscribe(this)
    }
  }

  unmount () {
    this.slot.empty()
  }

  next (text: string) {
    this.setText(text)
  }

  private setText (text: string) {
    this.textNode.textContent = text
  }
}

interface CreateElementSignature {
  (tag: string, subject?: WitnessSubject, props?: WitnessProps, children?: WitnessElement[]): WitnessElement
  (tag: string, subject?: WitnessSubject, children?: WitnessElement[]): WitnessElement
  (tag: string, props?: WitnessProps, children?: WitnessElement[]): WitnessElement
  (tag: string, children?: WitnessElement[]): WitnessElement
}

export const createElement: CreateElementSignature = (tag: string, ...args: any[]) => {
  let children: WitnessElement[] | undefined
  let props: WitnessProps | undefined
  let subject: InternalWitnessSubject | undefined

  // Resolve argument order
  if (Array.isArray(args[0])) {
    children = args.shift()
  } else if (args[0] instanceof InternalWitnessSubject) {
    subject = args.shift()

    if (Array.isArray(args[0])) {
      children = args.shift()
    } else {
      props = args.shift()
      children = args.shift()
    }
  } else {
    props = args.shift()
    children = args.shift()
  }

  return new StaticStructureElement(tag, props, children, subject)
}

class XstreamSubject<T> implements Subject<T> {
  constructor (private stream: xstream<T>) {}

  event (e: T) {
    this.stream.shamefullySendNext(e)
  }

  error (e: any) {
    this.stream.shamefullySendError(e)
  }

  end () {
    this.stream.shamefullySendComplete()
  }
}

const createItemSubject = <T> (item: T): [Subject<T>, Observable<T>] => {
  const stream = xstream.of(item)
  const subject = new XstreamSubject(stream)

  return [subject, stream]
}

export const map = <T> (
  keyProp: (keyof T) | ((v: T) => string | number),
  list_: Observable<T[]>,
  mapper: (i: Observable<T>) => WitnessElement
): WitnessElement => {
  let createKey = keyProp instanceof Function
    ? (v: T) => String(keyProp(v))
    : (v: T) => String(v[keyProp])

  return new ListElement(createKey, list_, mapper, createItemSubject)
}

export const text = <T> (text_: string | Observable<string>) => {
  return new TextElement(text_)
}

export const cond = <T> (value_: Observable<T>, ...cases: [T | ((v: T) => boolean), WitnessElement][]) => {
  cases.push([() => true, new EmptyElement()])

  return new CaseElement(value_, cases)
}

export const otherwise = () => {
  return true
}

export const render = (element: WitnessElement, el: HTMLElement) => {
  const slot = new StaticChildSlot(el)
  element.mount(slot)

  return {
    unmount: () => {
      element.unmount()
    }
  }
}
