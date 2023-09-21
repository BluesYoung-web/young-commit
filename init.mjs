#!/usr/bin/env node
try {
  await import('simple-git-hooks/postinstall.js')
  console.log('simple-git-hooks installed successfully')
}
catch (error) {
  console.log('just use, not dev')
}
