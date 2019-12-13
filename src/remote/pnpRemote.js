/**
Manage plug and play connection to Ambianic Edge.
*/

import { Peer } from 'peerjs'

let lastPeerId = null
let peer = null // own peer object
let conn = null



/**
* Create the connection between the two Peers.
*
* Sets up callbacks that handle any events related to the
* connection and data received on it.
*/
function join() {

}
/**
* Get first 'GET style' parameter from href.
* This enables delivering an initial command upon page load.
*
* Would have been easier to use location.hash.
*/
function getUrlParam(name) {
   name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]')
   var regexS = '[\\?&]' + name + '=([^&#]*)'
   var regex = new RegExp(regexS)
   var results = regex.exec(window.location.href)
   if (results == null)
       return null
   else
       return results[1]
}
/**
* Send a signal via the peer connection and add it to the log.
* This will only occur if the connection is still alive.
*/
function signal(sigName) {
   if (conn.open) {
       conn.send(sigName)
       console.log('pnpRemote', sigName, ' signal sent')
       addMessage(cueString + sigName)
   }
}
goButton.onclick = function () {
   signal('Go')
}
resetButton.onclick = function () {
   signal('Reset')
}
fadeButton.onclick = function () {
   signal('Fade')
}
offButton.onclick = function () {
   signal('Off')
}
function addMessage(msg) {
   var now = new Date()
   var h = now.getHours()
   var m = addZero(now.getMinutes())
   var s = addZero(now.getSeconds())
   if (h > 12)
       h -= 12
   else if (h === 0)
       h = 12
   function addZero(t) {
       if (t < 10)
           t = '0' + t
       return t
   }
   message.innerHTML = '<br><span class=\'msg-time\'>' + h + ':' + m + ':' + s + '</span>  -  ' + msg + message.innerHTML
}
function clearMessages() {
   message.innerHTML = ''
   addMessage('Msgs cleared')
}
// Listen for enter in message box
sendMessageBox.onkeypress = function (e) {
   var event = e || window.event
   var char = event.which || event.keyCode
   if (char == '13')
       sendButton.click()
}
// Send message
sendButton.onclick = function () {
   if (conn.open) {
       var msg = sendMessageBox.value
       sendMessageBox.value = ''
       conn.send(msg)
       console.log('Sent: ' + msg)
       addMessage('<span class=\'selfMsg\'>Self: </span> ' + msg)
   }
}
// Clear messages box
clearMsgsButton.onclick = function () {
   clearMessages()
}
// Start peer connection on click
connectButton.addEventListener('click', join)
// Since all our callbacks are setup, start the process of obtaining an ID
initialize()
