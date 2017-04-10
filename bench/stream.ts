
import {range, scan} from 'ramda'
import xs from 'xstream'
import {createElement as h, render} from '../src/witness'

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

const count = 100
const totalWidth = window.innerWidth - 200
const totalHeight = window.innerHeight - 50

const itemSize = 50
const start = 0
const end = totalWidth
const secondPerFrame = 1 / 60
const stiffness = 220
const damper = 20
const percision = 0.01

class AnimationStream {
  listener: any
  id: number

  constructor () {
    this.call = this.call.bind(this)
  }

  call () {
    this.listener.next()
    this.id = requestAnimationFrame(this.call)
  }

  start (listener: any) {
    this.listener = listener

    this.id = requestAnimationFrame(this.call)
  }

  stop () {
    cancelAnimationFrame(this.id)
  }
}

const createAnimationStream = () => {
  let id: number | null = null


  return xs.create(new AnimationStream())
}


const createStreams = (count: number) => {
  let baseDest = 0
  const base_ = createAnimationStream().fold(([pos, velo]) => {
    if (Math.abs(pos - baseDest) < 10) {
      baseDest = baseDest === start ? end : start
    }

    return stepper(secondPerFrame, pos, velo, baseDest, stiffness, damper, percision)
  }, [0, 0])

  const velos = range(0, count - 1).map(_ => 0)
  const positions = base_.fold((positions, [basePos]) => {
    let i = 0
    let last = basePos
    return positions.map((current) => {
      const [newPos, velo] = stepper(secondPerFrame, current, velos[i], last, stiffness, damper, percision)
      velos[i] = velo
      last = newPos
      i++
      return newPos
    }, basePos)
  }, range(0, count - 1).map(_ => start))

  const rest = range(0, count - 1).map(i => {
    return positions.map(list => list[i])
  })

  return [
    base_.map(([pos]) => pos),
    ...rest
  ]
}

const getStyle = (size: number, pos_: xs<number>) => ({
  borderRadius: size + 'px',
  transform: pos_.map((pos) => `translate(${pos}px)`),
  width: size + 'px',
  height: size + 'px',
  backgroundColor: 'red',
  display: 'block'
})


const app = () => {
  const streams = createStreams(count)
  return h('div', streams.map(pos_ => h('div', {style: getStyle(itemSize, pos_)})))
}

const el = document.createElement('div')
document.body.appendChild(el)

render(app(), el)
