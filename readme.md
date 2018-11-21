# tdl-multiprocess

Node.js module `tdl` crashes when multiple Client instances are used in the same process.
The reason behind this is that all client instances are using one instance of underlying tdl library.
This package was written to workaround the issue by spawning each Client instance in a dedicated process.

The API is the same as in `tdl`. It is a drop-in replacement for `tdl` in your code. However, you still must
include `tdl` module in your own `package.json` to meet peer dependency.


## Example usage
```
const { Client } = require('tdl-multiprocess')

const client = new Client({
  apiId: 2222, // Your api_id
  apiHash: '0123456789abcdef0123456789abcdef' // Your api_hash
})

await client.connect()
await client.login(() => ({
  type: 'user',
  phoneNumber: '00123456789'
}))
```