const os = require("os")
const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")
const { execSync } = require("child_process")

class Cloudenv {
  constructor(bearerFile) {
    this.VERSION = "0.1.0"
    this.API_HOST = "https://app.cloudenv.com"
    this.READ_PATH = "/api/v1/envs"
    this.SECRET_KEY_FILENAME = ".cloudenv-secret-key"
  }

  config() {
    if (fs.existsSync(bearerFile.replace("~", os.homedir))) {
      const bearer = fs.readFileSync(bearerFile.replace("~", os.homedir), 'utf8')
      let secretKeyFile = this.SECRET_KEY_FILENAME

      while (!fs.existsSync(secretKeyFile) && secretKeyFile !== "/" + this.SECRET_KEY_FILENAME) {
        secretKeyFile = path.resolve(path.dirname(secretKeyFile) + "/../" + this.SECRET_KEY_FILENAME)
      }

      if (fs.existsSync(secretKeyFile)) {
        const data = fs.readFileSync(secretKeyFile, 'utf8')
        var [app, secretKey] = data.split(/\r?\n/)

        if (process.env.NODE_ENV !== undefined) {
          const stdout = execSync(`curl -s -H "Authorization: Bearer ${bearer.trim()}" "https://app.cloudenv.com/api/v1/envs?name=${app}&environment=${process.env.NODE_ENV}&version=${this.VERSION}&lang=node" | openssl enc -a -aes-256-cbc -md sha512 -d -pass pass:"${secretKey}" 2> /dev/null`)
          const buf = Buffer.from(stdout)
          const vars = dotenv.parse(buf)
          for (const k in vars) {
            if (process.env[k] === undefined) {
              process.env[k] = vars[k]
            }
          }
        }

        const stdout2 = execSync(`curl -s -H "Authorization: Bearer ${bearer.trim()}" "https://app.cloudenv.com/api/v1/envs?name=${app}&environment=default&version=${this.VERSION}&lang=node" | openssl enc -a -aes-256-cbc -md sha512 -d -pass pass:"${secretKey}" 2> /dev/null`)
        const buf2 = Buffer.from(stdout2)
        const vars2 = dotenv.parse(buf2)
        for (const k2 in vars2) {
          if (process.env[k2] === undefined) {
            process.env[k2] = vars2[k2]
          }
        }
      } else {
        console.error("ERROR: cloudenv could not find a .cloudenv-secret-key in the directory path")
      }
    } else {
      console.error("ERROR: cloudenv could not find a .cloudenvrc in your home directory, please run cloudenv login")
    }
  }
}

const env_path = process.env.ENV_PATH || ".env"
const env = fs.existsSync(env_path) ? dotenv.parse(fs.readFileSync(env_path)) : {}

bearerFile = process.env.CLOUDENV_BEARER_PATH || env.CLOUDENV_BEARER_PATH || "~/.cloudenvrc"

module.exports = new Cloudenv(bearerFile).config()