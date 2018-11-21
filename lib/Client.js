const child_process = require('child_process')
const IPC = require('node-ipc-promise');
const EventEmitter = require('events')

class Client extends EventEmitter{
  constructor(options) {
    super()
    this.options = options
  }

  async connect() {
    this.child = child_process.fork(require.resolve('./Child'), [JSON.stringify(this.options)])
    this.ipc = IPC(this.child);

    this.authMethods = {}

    this.ipc.register('eventUpdate', (e) => {
      this.emit('update', JSON.parse(e))
    })

    this.ipc.register('eventAuthNeeded', (e) => {
      this.emit('auth-needed', JSON.parse(e))
    })

    this.ipc.register('eventAuthNotNeeded', (e) => {
      this.emit('auth-not-needed', JSON.parse(e))
    })

    this.ipc.register('getAuthCode', (info) => {
      const args = JSON.parse(info)
      return this.authMethods.getAuthCode(args.retry)
    })

    this.ipc.register('getPassword', (info) => {
      const args = JSON.parse(info)
      return this.authMethods.getPassword(args.passwordHint, args.retry)
    })

    this.ipc.register('getName', () => {
      return this.authMethods.getName()
    })

    await this._sendIpcCommand('init')
    return this._sendIpcCommand('connect')
  }

  login(fn) {
    this.authMethods = {}
    const loginDetails = fn()
    const loginType = loginDetails.type || 'user'
    if (loginType !== 'bot' && loginType !== 'user') {
      return Promise.reject(new Error('Unsupported login type'))
    }

    if (loginDetails.type === 'bot') {
      return this._sendIpcCommand('login', loginDetails)
    }

    if (loginDetails.getAuthCode) {
      this.authMethods.getAuthCode = loginDetails.getAuthCode
    }

    if (loginDetails.getPassword) {
      this.authMethods.getPassword = loginDetails.getPassword
    }

    if (loginDetails.getName) {
      this.authMethods.getName = loginDetails.getName
    }

    return this._sendIpcCommand('login', {
      type: loginType,
      phoneNumber: loginDetails.phoneNumber,
      getAuthCode: !!loginDetails.getAuthCode,
      getPassword: !!loginDetails.getPassword,
      getName: !!loginDetails.getName
    })
  }

  invoke(query) {
    return this._sendIpcCommand('invoke', query)
  }

  pause() {
    return this._sendIpcCommand('pause')
  }

  resume() {
    return this._sendIpcCommand('resume')
  }

  connectAndLogin() {
    return this._sendIpcCommand('connectAndLogin')
  }

  destroy() {
    return this._sendIpcCommand('destroy')
  }

  setLogMaxFileSize(maxFileSize) {
    return this._sendIpcCommand('setLogMaxFileSize', maxFileSize)
  }

  setLogFilePath(path) {
    return this._sendIpcCommand('setLogFilePath', path)
  }

  setLogVerbosityLevel(verbosity) {
    return this._sendIpcCommand('setLogVerbosityLevel', verbosity)
  }

  async _sendIpcCommand(command, arg) {
    const sArg = !!arg ? JSON.stringify(arg): undefined
    const response = await this.ipc.exec(command, sArg)
    if (!response) {
      return Promise.resolve()
    }

    const pResponse = JSON.parse(response)

    if (pResponse.error) {
      return Promise.reject(new Error(pResponse.error))
    }
    return Promise.resolve(pResponse)
  }
}

module.exports = { Client }