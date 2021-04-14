import Vue from 'vue'
import { mount, createLocalVue } from '@vue/test-utils'
import Vuetify from 'vuetify'
import Vuex from 'vuex'
import VueRouter from 'vue-router'
import { cloneDeep } from 'lodash'
import pnp from '@/store/pnp.js'
import {
  PEER_DISCONNECTED,
  PEER_CONNECTING,
  PEER_DISCOVERING,
  PEER_DISCOVERED,
  PEER_AUTHENTICATING,
  PEER_CONNECTED,
  PEER_CONNECTION_ERROR,
  PNP_SERVICE_DISCONNECTED,
  PNP_SERVICE_CONNECTING,
  PNP_SERVICE_CONNECTED,
  USER_MESSAGE,
  NEW_PEER_ID,
  NEW_REMOTE_PEER_ID,
  REMOTE_PEER_ID_REMOVED,
  PEER_FETCH
} from '@/store/mutation-types.js'
import {
  INITIALIZE_PNP,
  PNP_SERVICE_CONNECT,
  PNP_SERVICE_RECONNECT,
  PEER_DISCOVER,
  PEER_CONNECT,
  PEER_AUTHENTICATE,
  REMOVE_REMOTE_PEER_ID,
  CHANGE_REMOTE_PEER_ID,
  HANDLE_PEER_CONNECTION_ERROR
} from '@/store/action-types.js'
import { ambianicConf } from '@/config'

jest.mock('peerjs'); // Peer is now a mock class
import Peer from 'peerjs'

describe('PnP state machine actions - p2p communication layer', () => {
// global
  
  // localVue is used for tests instead of the production Vue instance
  let localVue

  // the Vuex store we will be testing against
  let store

  beforeEach(() => {
    localVue = createLocalVue()
    localVue.use(Vuex)    
    store = new Vuex.Store({ modules: { pnp: cloneDeep(pnp) } })
    // console.debug("store:", store )
    // const state = store.state
    // console.debug("store.state:", { state } )
    Peer.mockClear()
    // mocking window.RTCPeerConnection
    const mockPeerConnection = jest.fn()
    // mocking the RTCPeerConnection.on() method
    mockPeerConnection.on = jest.fn()
    // mocking Peer.connect() to return an RTCPeerConnection mock
    jest.spyOn(Peer.prototype, 'connect').mockImplementation(() => mockPeerConnection)
    // fast forward js timers during testing
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.restoreAllMocks()
  })
  
  // test Vuex actions

  // Tests functions are async since Vuex actions are async.
  // This allows use of await which makes the code more readable.

  test('INITIALIZE_PNP on app start', async () => {
    expect(store.state.pnp.peerConnection).toBe(undefined)
    expect(store.state.pnp.peerConnectionStatus).toBe(PEER_DISCONNECTED)
    expect(store.state.pnp.pnpServiceConnectionStatus).toBe(PNP_SERVICE_DISCONNECTED)
    expect(store.state.pnp.peerFetch).toBe(undefined)
    await store.dispatch(INITIALIZE_PNP)
    expect(store.state.pnp.peerConnection).toBe(undefined)
    expect(store.state.pnp.peerConnectionStatus).toBe(PEER_DISCONNECTED)
    expect(store.state.pnp.pnpServiceConnectionStatus).toBe(PNP_SERVICE_CONNECTING)
    expect(store.state.pnp.peerFetch).toBe(undefined)
    expect(Peer).toHaveBeenCalledTimes(1);
    expect(Peer).toHaveBeenCalledWith(store.state.myPeerId,
      {
        host: ambianicConf.AMBIANIC_PNP_HOST,
        port: ambianicConf.AMBIANIC_PNP_PORT,
        secure: ambianicConf.AMBIANIC_PNP_SECURE,
        debug: 3
      });
  })

  test('PNP_SERVICE_CONNECT on app start', async () => {
    expect(store.state.pnp.peerConnection).toBe(undefined)
    expect(store.state.pnp.peerConnectionStatus).toBe(PEER_DISCONNECTED)
    expect(store.state.pnp.pnpServiceConnectionStatus).toBe(PNP_SERVICE_DISCONNECTED)
    expect(store.state.pnp.peerFetch).toBe(undefined)
    await store.dispatch(PNP_SERVICE_CONNECT)
    expect(store.state.pnp.peerConnection).toBe(undefined)
    expect(store.state.pnp.peerConnectionStatus).toBe(PEER_DISCONNECTED)
    expect(store.state.pnp.pnpServiceConnectionStatus).toBe(PNP_SERVICE_CONNECTING)
    expect(store.state.pnp.peerFetch).toBe(undefined)
    expect(Peer).toHaveBeenCalledTimes(1)
    const peer = store.state.pnp.peer
    expect(peer.on).toHaveBeenCalledTimes(5)
    expect(peer.on).toHaveBeenCalledWith(
      'open',
      expect.anything()
    )
    expect(peer.on).toHaveBeenCalledWith(
      'disconnected',
      expect.anything()
    )      
    expect(peer.on).toHaveBeenCalledWith(
      'close',
      expect.anything()
    )      
    expect(peer.on).toHaveBeenCalledWith(
      'error',
      expect.anything()
    )      
    expect(peer.on).toHaveBeenCalledWith(
      'connection',
      expect.anything()
    )      
  })

  test('PNP_SERVICE_RECONNECT assuming existing peer disconnected', async () => {
    expect(store.state.pnp.pnpServiceConnectionStatus).toBe(PNP_SERVICE_DISCONNECTED)
    // emulate via mock Peer instance
    const peer = new Peer()
    store.state.pnp.peer = peer
    peer.id = 'some ID'
    store.state.pnp.myPeerId = 'some saved ID'
    await store.dispatch(PNP_SERVICE_RECONNECT)
    expect(store.state.pnp.pnpServiceConnectionStatus).toBe(PNP_SERVICE_CONNECTING)
    expect(peer._lastServerId).toBe('some saved ID')
    expect(peer.reconnect).toHaveBeenCalledTimes(1)
  })

  test('PNP_SERVICE_RECONNECT when peer lost id', async () => {
    expect(store.state.pnp.pnpServiceConnectionStatus).toBe(PNP_SERVICE_DISCONNECTED)
    // emulate via mock Peer instance
    const peer = new Peer()
    store.state.pnp.peer = peer
    store.state.pnp.myPeerId = 'some ID'
    peer.id = undefined
    await store.dispatch(PNP_SERVICE_RECONNECT)
    expect(store.state.pnp.pnpServiceConnectionStatus).toBe(PNP_SERVICE_CONNECTING)
    expect(peer._id).toBe('some ID')
    expect(peer._lastServerId).toBe('some ID')
    expect(peer.reconnect).toHaveBeenCalledTimes(1)
  })

  test('PEER_DISCOVER when peer is connected', async () => {
    store.state.pnp.peerConnectionStatus = PEER_CONNECTED
    await store.dispatch(PEER_DISCOVER)
    expect(store.state.pnp.peerConnectionStatus).not.toBe(PEER_DISCOVERING)
    expect(store.state.pnp.peerConnectionStatus).toBe(PEER_CONNECTED)
  })

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  test('PEER_DISCOVER when peer is disconnected and local and remote peer ids are known', async () => {
    expect(store.state.pnp.peerConnectionStatus).toBe(PEER_DISCONNECTED)
    expect(store.state.pnp.pnpServiceConnectionStatus).toBe(PNP_SERVICE_DISCONNECTED)
    // emulate peer instance exists and local peer id is known
    const peer = new Peer()
    store.state.pnp.peer = peer
    peer.id = 'some_ID'
    store.state.pnp.myPeerId = 'some_saved_ID'
    await store.dispatch(PEER_DISCOVER)
    expect(store.state.pnp.peerConnectionStatus).toBe(PEER_DISCOVERING)
    // At this point in time, there should have been a single call to
    // setTimeout to schedule another peer discovery loop.
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), store.state.pnp.discoveryLoopPause);
    // emulate the use case when remotePeerId is already known 
    // and connection is established
    store.state.pnp.remotePeerId = 'a_known_remote_peer_id'
    store.state.pnp.pnpServiceConnectionStatus = PNP_SERVICE_CONNECTED
    // Fast forward and exhaust only currently pending timers
    // (but not any new timers that get created during that process)
    console.debug('jest running pending timers')
    await jest.runOnlyPendingTimers()
    expect(store.state.pnp.peerConnectionStatus).toBe(PEER_CONNECTING)
  })

  test('PEER_CONNECT attempt connection to a remote peer that is not responding', async () => {
    // emulate peer is disconnected
    store.state.pnp.peerConnectionStatus = PEER_DISCONNECTED
    // emulate PNP signaling service connection exists
    store.state.pnp.pnpServiceConnectionStatus = PNP_SERVICE_CONNECTED
    // emulate peer instance exists and local peer id is known
    const peer = new Peer()
    store.state.pnp.peer = peer
    peer.id = 'some_ID'
    expect(Peer).toHaveBeenCalledTimes(1)
    store.state.pnp.myPeerId = 'some_saved_ID'
    // emulate a dangling peerConnection still exists
    const peerConnection = jest.fn()
    store.state.pnp.peerConnection = peerConnection
    peerConnection.close = jest.fn()
    // emulate a known remote peer id
    const remotePeerId = 'a_known_remote_peer_id'
    // emulate PEER_CONNECT vuex action
    await store.dispatch(PEER_CONNECT, remotePeerId)

    expect(store.state.pnp.peerConnection.close).toHaveBeenCalledTimes(1)
    expect(store.state.pnp.peerConnectionStatus).toBe(PEER_CONNECTING)

    // At this point in time, there should have been a single call to
    // setTimeout to schedule a check on pending connections in 30 seconds
    expect(setTimeout).toHaveBeenCalledTimes(1)
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 30000)

    // Fast forward and exhaust only currently pending timers
    // (but not any new timers that get created during that process)
    console.debug('jest running pending timers')
    await jest.runOnlyPendingTimers();

    // existing peer should have been destroyed
    expect(peer.destroy).toHaveBeenCalledTimes(1)
    // new peer instance should have been created
    console.debug('Peer constructor calls', Peer.mock.calls)
    expect(Peer).toHaveBeenCalledTimes(2)
    expect(store.state.pnp.peer).not.toBe(peer)
    // reconnect sequence should have been started
    expect(store.state.pnp.pnpServiceConnectionStatus).toBe(PNP_SERVICE_CONNECTING)
  })

  test('peer connection error callback: Peer.on("error")', async () => {
    await store.dispatch(PNP_SERVICE_CONNECT)
    const peer = store.state.pnp.peer
    console.debug('peer.on.mock.calls', peer.on.mock.calls)
    const onErrorCallback = peer.on.mock.calls.find(callbackDetails => callbackDetails[0] === 'error');
    console.debug('onErrorCallback', onErrorCallback)
    onErrorCallback[1]('a_network_error')
    expect(store.state.pnp.pnpServiceConnectionStatus).toBe(PNP_SERVICE_DISCONNECTED)
    expect(store.state.pnp.peerConnectionStatus).toBe(PEER_DISCONNECTED)
    // setTimeout should be called to INITIALIZE_PNP
    expect(setTimeout).toHaveBeenCalledTimes(1)
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 3000)
  })

})
