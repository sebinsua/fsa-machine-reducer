#!/usr/bin/env node
const constantCase = require('constant-case')

const identity = v => v
const noop = () => undefined

const Machine = (state, reducer) => ({
  step: a => {
    const [ s, r ] = reducer(state, a)
    return Machine(s, r || reducer)
  },
  extract: () => state
})

const World = (state, reducer) => [ state, reducer ]

const handleActions = (reducerMap, defaultState = {}) => {
  return (state, action) => {
    const {
      update = identity,
      next = noop
    } = reducerMap[action.type]
    const newState = update(state, action)
    const newReducer = next(state, action)
    return World(newState, newReducer)
  }
}

const isLoggedOut = handleActions({
  LOGIN: {
    update: (state, action) => Object.assign({}, state, { user: action.payload.user, loggedIn: true }),
    next: (state, action) => isLoggedIn
  }
});

const isLoggedIn = handleActions({
  LOGOUT: {
    update: (state, action) => Object.assign({}, state, { user: null, loggedIn: false }),
    next: (state, action) => isLoggedOut
  }
})

const createMachine = (initialState, initialReducer) => {
  const machineProxy = new Proxy({
    machine: Machine(initialState, initialReducer),
    extract() {
      return this.machine.extract()
    }
  }, {
    get(target, property, receiver) {
      if (target[property]) {
        return target[property]
      }

      return (payload) => {
        const newMachine = target.machine.step({ type: constantCase(property), payload })
        target.machine = newMachine
        return machineProxy
      }
    },
  })
  return machineProxy
}

const machine = createMachine({}, isLoggedOut)

// TODO:
// 0. Consider aggregate reducers and dependent field calculations.
// 1. Can we allow normal setting of properties against the object, and handle it with a very standard reducer?
// 2. Can we get these values out?
// 3. Can we listen to all steps for debugging?
// 4. Can we batch enable or disable reducers, by swapping out aggregate reducers?
// 5. Can we cause the machine to return to its default state, at any level?
// 6. Can we undo a previous step?

machine
  .login({ user: 'seb' })
  .logout()
  .login({ user: 'billy' })

console.log(machine.extract())
