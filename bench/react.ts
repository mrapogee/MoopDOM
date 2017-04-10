
import * as React from 'react'
import * as DOM from 'react-dom'

const h = React.createElement

/* Algorithm from react-motion */
const stepper = (
  secondPerFrame: number,
  x: number,
  v: number,
  destX: number,
  stiffness: number,
  damber: number,
  percision: number
) => {
  const springRate = -stiffness * (x - destX)
  const damperRate = -damber * v
  const flowRate = springRate + damperRate

  const newV = v + flowRate * secondPerFrame
  const newX = x + newV * secondPerFrame

  if (Math.abs(newV) < percision && Math.abs(newX - destX) < percision) {
    return [destX, 0]
  } else {
    return [newX, newV]
  }
}

const count = 600
const range10 = Array.from(new Array(count)).map((_, i) => i)

const totalWidth = window.innerWidth - 200
const totalHeight = window.innerHeight - 50

const start = 0
const end = totalWidth
const secondPerFrame = 1 / 60
const stiffness = 220
const damper = 20
const percision = 0.01

class ReactComponent extends React.Component<{}, {positions: number[]}> {
  private velos: number[] = []
  private dest: number = 0

  constructor () {
    super()
    this.update = this.update.bind(this)

    requestAnimationFrame(this.update)

    let i = 0;
    this.state = { positions: range10.map(_ => i += 0) }
    this.velos = range10.map(_ => 0)
  }

  update () {
    if (Math.abs(this.state.positions[this.state.positions.length - 1] - this.dest) < 10) {
      this.dest = this.dest === start ? end : start
    }

    this.setState({
      positions: this.state.positions.map((p, i) => {
        const [pos, velo] = stepper(secondPerFrame, p, this.velos[i], this.state.positions[i + 1] || this.dest, stiffness, damper, percision)
        this.velos[i] = velo

        return pos
      })
    })

    requestAnimationFrame(this.update)
  }

  render () {
    const size = (totalHeight / count) + 'px'
    return h('div', {}, [
      this.state.positions.map((pos) => h('div', {style: {borderRadius: size, transform: `translate(${pos}px)`, width: size, height: size, backgroundColor: 'red', display: 'block'}}))
    ])
  }
}

const root = document.createElement('div')
document.body.appendChild(root)

DOM.render(h(ReactComponent), root)
