const os = require("os")
const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")
const { execSync } = require("child_process")

class Cloudenv {
  constructor() {
    this.VERSION = "0.2.6"
    this.API_HOST = "https://app.cloudenv.com"
    this.READ_PATH = "/api/v1/envs"
    this.SECRET_KEY_FILENAME = ".cloudenv-secret-key"
    this.CLOUDENV_RC = "~/.cloudenvrc"
  }

  config() {
    const env_path = process.env.ENV_PATH || ".env"
    const env = fs.existsSync(env_path) ? dotenv.parse(fs.readFileSync(env_path)) : {}

    if (process.env.CLOUDENV_BEARER_TOKEN || env.CLOUDENV_BEARER_TOKEN) {
      this.bearer = process.env.CLOUDENV_BEARER_TOKEN || env.CLOUDENV_BEARER_TOKEN
    } else {
      bearerFilename = process.env.CLOUDENV_BEARER_PATH || env.CLOUDENV_BEARER_PATH || this.CLOUDENV_RC
      if(fs.existsSync(bearerFilename.replace("~", os.homedir))) {
        this.bearer = fs.readFileSync(bearerFilename.replace("~", os.homedir), 'utf8')
      }
    }

    if ((process.env.CLOUDENV_APP_SLUG || env.CLOUDENV_APP_SLUG) && (process.env.CLOUDENV_APP_SECRET_KEY || env.CLOUDENV_APP_SECRET_KEY)) {
      this.app = (process.env.CLOUDENV_APP_SLUG || env.CLOUDENV_APP_SLUG)
      this.secretKey = (process.env.CLOUDENV_APP_SECRET_KEY || env.CLOUDENV_APP_SECRET_KEY)
    } else {
      let secretKeyFile = process.env.CLOUDENV_APP_SECRET_KEY_PATH || env.CLOUDENV_APP_SECRET_KEY_PATH || this.SECRET_KEY_FILENAME

      while (!fs.existsSync(secretKeyFile) && secretKeyFile !== "/" + this.SECRET_KEY_FILENAME) {
        secretKeyFile = path.resolve(path.dirname(secretKeyFile) + "/../" + this.SECRET_KEY_FILENAME)
      }

      if (fs.existsSync(secretKeyFile)) {
        const data = fs.readFileSync(secretKeyFile, 'utf8')
        var [app, secretKey] = data.split(/\r?\n/)

        this.app = app.split[1]
        this.secretKey = secretKey.split[1]
      }
    }

    if (this.bearer && this.app && this.secretKey) {
      if (process.env.NODE_ENV !== undefined) {
        const stdout = execSync(`curl -s -H "Authorization: Bearer ${this.bearer.trim()}" "${this.API_HOST}${this.READ_PATH}?name=${this.app}&environment=${process.env.NODE_ENV}&version=${this.VERSION}&lang=node" | openssl enc -a -aes-256-cbc -md sha512 -d -pass pass:"${this.secretKey}" 2> /dev/null`)
        const buf = Buffer.from(stdout)
        const vars = dotenv.parse(buf)
        for (const k in vars) {
          if (process.env[k] === undefined) {
            process.env[k] = vars[k]
          }
        }
      }

      const stdout2 = execSync(`curl -s -H "Authorization: Bearer ${this.bearer.trim()}" "${this.API_HOST}${this.READ_PATH}?name=${this.app}&environment=default&version=${this.VERSION}&lang=node" | openssl enc -a -aes-256-cbc -md sha512 -d -pass pass:"${this.secretKey}" 2> /dev/null`)
      const buf2 = Buffer.from(stdout2)
      const vars2 = dotenv.parse(buf2)
      for (const k2 in vars2) {
        if (process.env[k2] === undefined) {
          process.env[k2] = vars2[k2]
        }
      }
    } else {
      console.error('WARNING: cloudenv could not find a .cloudenv-secret-key in the directory path or values for both process.env.CLOUDENV_APP_SLUG and process.env.CLOUDENV_APP_SECRET_KEY')
    }
  }
}

module.exports = new Cloudenv().config()