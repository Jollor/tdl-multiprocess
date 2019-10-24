const EventEmitter = require('events')
const IPC = require('node-ipc-promise')
const { Client } = require('tdl')
const ipc = IPC();
const options = JSON.parse(process.argv[2])

class Child extends EventEmitter {

  constructor() {
    super()

    this.client = new Client(options)
    this.isDestroyed = false

    ipc.register('init', async () => {
      await this.init()
    });
  }

  async init() {

    this.client.on('update', (e) => {
      return ipc.exec('eventUpdate', JSON.stringify(e))
    })

    this.client.on('auth-needed', (e) => {
      return ipc.exec('eventAuthNeeded', JSON.stringify(e))
    })

    this.client.on('auth-not-needed', (e) => {
      return ipc.exec('eventAuthNotNeeded', JSON.stringify(e))
    })

    ipc.register('invoke', async (args) => {
      const result = await this.client.invoke(JSON.parse(args))
        .catch(err => {
          return { error: err.message}
        })

      return Promise.resolve(JSON.stringify(result))
    });

    ipc.register('connect', async () => {
      return this.client.connect()
    });

    ipc.register('login', async (sLoginDetails) => {

      const loginDetails = JSON.parse(sLoginDetails)

      const details = {
        phoneNumber: loginDetails.phoneNumber,
        type: loginDetails.type
      }

      if (loginDetails.getAuthCode) {
        details.getAuthCode = (retry) => {
          return ipc.exec('getAuthCode', JSON.stringify({ retry }))
        }
      } else {
        delete details.getAuthCode
      }

      if (loginDetails.getPassword) {
        details.getPassword = (passwordHint, retry) => {
          return ipc.exec('getPassword', JSON.stringify({ passwordHint, retry }))
        }
      } else {
        delete details.getPassword
      }

      if (loginDetails.getName) {
        details.getName = () => ipc.exec('getName')
      } else {
        delete details.getName
      }

      return this.client.login(() => details)
    });

    ipc.register('pause', async () => {
      return this.client.pause()
    });

    ipc.register('resume', async () => {
      return this.client.resume()
    });

    ipc.register('connectAndLogin', async () => {
      return this.client.connectAndLogin()
    });

    ipc.register('setLogMaxFileSize', async (maxFileSize) => {
      return this.client.setLogMaxFileSize(Number(maxFileSize))
    });

    ipc.register('setLogFilePath', async (path) => {
      return this.client.setLogFilePath(path)
    });

    ipc.register('setLogVerbosityLevel', async (verbosity) => {
      return this.client.setLogVerbosityLevel(Number(verbosity))
    });

    ipc.register('destroy', async () => {
      this.isDestroyed = true
      await this.client.destroy()
      process.exit(0)
    });
  }
}

new Child()

setInterval(() => {}, 5000)
