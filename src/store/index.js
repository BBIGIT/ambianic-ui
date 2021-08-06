import Vue from 'vue'
import Vuex from 'vuex'
import PNPStore from './pnp.js'
import EdgeDeviceStore from './edge-device'
import { INITIALIZE_PNP } from './action-types.js'
import { UPDATE_AVAILABLE } from './mutation-types'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    updateToBeInstalled: undefined
  },
  mutations: {
    [UPDATE_AVAILABLE] (state, updateToBeInstalled) {
      state.updateToBeInstalled = updateToBeInstalled
    }
  },
  actions: {
  },
  modules: {
    pnp: PNPStore,
    edgeDeviceStore: EdgeDeviceStore
  }
})

/**
  Begin connection attempt to Ambianic Edge as soon as the app is created
*/
store.dispatch(INITIALIZE_PNP)

export default store
