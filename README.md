
## Warning: Work in progress - the info below probably doesn't work. The package is not yet on npm
## Note: This intro assumes you are familiare with observables and virtual diffing libraries.

# MoopDOM

This is an experimental project that eliminates the need for virtual diffing for apps that use observables, making style and propety changes much much faster, and apps more scalable.

Virtual diffing is optimized for large application changes, but those aren't the changes that need optimizing. Most of the time, performance in javascript only matters if piece of code is going to be running 60 times per second when animating or constantly updating. So why do we walk big chunks of the tree for updates that only change a couple of proprties?

Let's see what moop looks like:

```javascript
import {createElement as h, render} 'moopdom'
import xstream from 'xstream'

const app = () => {
  const size_ = xstream.periodic(1000 / 60).map(_ => `${500 * Math.random()}px`)

  return h('div', {
    style: {
      // Note: we don't `map` the size_ to unwrap the value, we set the
      // observable directly on the hyperscript element
      width: size_,
      height: size_,

      // You can also use normal strings
      backgroundColor: '#000'
    }
  })
}

render(
  app(), // Note: we apply before sending to render
  document.querySelector('#app')
)
```

This example renders a square that randomly changes it's size 60 times per second. When `size_` emits a new random value, instead of diffing the entire tree, this is the only function called:

```javascript
  next (value: string) {
    this.el.element.style[this.prop] = value
  }
```

Yup. That's it. It just assigns the style directly to the html element. No matter how deep this example is code is in your appilcation tree, it will have the same instant performance.

# Conditions

Okay, this is awesome for non-structural changes. But what about when I need to render a dynamic list or have a conditional?

Conditional:

```javascript
import {
  createElement as h,
  render,
  // Conditional helper
  cond,
  otherwise,
  // Text helper
  text,
} 'moopdom'
import xstream from 'xstream'
import {gt} from 'ramda'

// Adds the 'px' unit to a stream of strings
const px = (s_) => s_.map(s => s + 'px')

const app = () => {
  const size_ = xstream.periodic(1000).map(_ => 500 * Math.random())

  const square = h('div', {
    style: { width: px(size_), height: px(size_), backgroundColor: '#000' }
  })

  return cond(size_,
    [gt(250), square],                // If size > 250, output the square
    [gt(100), text('to small')],      // else If size > 100 say 'to small'
    [otherwise, text('way to small!'] // otherwise, say 'way to small!'
  )
}

render(
  app(),
  document.querySelector('#app')
)
```

This is the conditional helper, it is similare to a guard in haskell or `cond` in clojure. Another form:

```javascript
cond(status_,
  // This will compare the predicate with the value of `status_` intil it finds a match
  ['saved', check],

  // You can combine with the conditional form
  [(v) => v.startsWith('error:'), text('An unkown error occured')],

  // This will show if the other cases don't match.
  [otherwise, text('loading...')]
)
```

# Lists

What about lists? Lists are tricky, because you don't want to re-render the entire list every time a new list appears, so just like with virtual diffing we use keys.

```javascript
import {
  // keyed list helper
  map
} from 'moopdom'
import xs from 'xstream'

const list_ = xs.of([{id: 'test', name: 'test'}, {}])

// Gets the keys value from a stream of objects
const pluck = <T> (key: keyof T, stream: Stream<T>): Stream<T[typeof key]> =>
  stream.map(v => v[key])

map('id', (o: Observable<T>) => User({name: pluck('name', o)}), list_,)
```

The above creates a list of `User` (which is just a function that accepts a name observable). The first argument `'id'` can be the key property or a function the returns a key from the object.