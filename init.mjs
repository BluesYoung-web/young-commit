#!/usr/bin/env node
import { execa } from 'execa'

try {
  await execa('npx', ['simple-git-hooks'])
  console.log('simple-git-hooks installed successfully')
}
catch (error) {
  console.log('just intsall to use, not dev')
}
