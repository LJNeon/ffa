<div align="center">
  <a href="https://travis-ci.org/LJNeon/ffa"><img src="https://api.travis-ci.org/LJNeon/ffa.svg?branch=master" alt="Build Status"/></a>
  <a href="https://david-dm.org/LJNeon/ffa"><img src="https://david-dm.org/LJNeon/ffa/status.png" alt="dependencies status"/></a>
  <a href="https://discord.gg/F7reg7e"><img src="https://img.shields.io/badge/discord-6k%20members-brightgreen.svg" alt="Discord Server"/></a>
  <a href="https://github.com/LJNeon/ffa/releases"><img src="https://img.shields.io/github/release/LJNeon/ffa/all.svg" alt="release"/></a>
  <a href="https://github.com/LJNeon/ffa/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-AGPL%20v3-blue.svg" alt="License"/></a>
</div>

# FFA
The core control of a free-for-all discord server.

# Database
FFA uses PostgreSQL 10, any previous versions may or may not work. Once PostgreSQL is installed and running you just need to create a `ffaAuth.yml` file using the example as a reference. FFA will use the default postgres account to create the database to use for you, and will automatically update the database as needed when you update FFA.
