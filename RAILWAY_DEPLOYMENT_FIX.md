[build]
builder = "nixpacks"

[deploy]
startCommand = "node railway-server.js"
restartPolicyType = "always"

[environments.production]
variables = { NODE_ENV = "production" }

[environments.production.deploy]
startCommand = "node railway-server.js" 