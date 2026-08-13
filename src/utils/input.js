const readline = require('readline');

function askHidden(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(query);
    
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    let input = '';
    
    const onData = (char) => {
      char = char.toString();
      
      switch (char) {
        case '\r':
        case '\n':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(input);
          break;
          
        case '\u0003':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          console.log('\nExit');
          process.exit(0);
          break;
          
        case '\u007f':
          if (input.length > 0) {
            input = input.slice(0, -1);
            readline.clearLine(stdout, 0);
            readline.cursorTo(stdout, 0);
            stdout.write(query + '*'.repeat(input.length));
          }
          break;
          
        default:
          if (char.charCodeAt(0) >= 32) {
            input += char;
            readline.clearLine(stdout, 0);
            readline.cursorTo(stdout, 0);
            stdout.write(query + '*'.repeat(input.length));
          }
          break;
      }
    };
    
    stdin.on('data', onData);
  });
}

function askQuestion(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(query);
    
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    let input = '';
    
    const onData = (char) => {
      char = char.toString();
      
      switch (char) {
        case '\r':
        case '\n':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(input);
          break;
          
        case '\u0003':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          console.log('\nExit');
          process.exit(0);
          break;
          
        case '\u007f':
          if (input.length > 0) {
            input = input.slice(0, -1);
            readline.clearLine(stdout, 0);
            readline.cursorTo(stdout, 0);
            stdout.write(query + input);
          }
          break;
          
        default:
          if (char.charCodeAt(0) >= 32) {
            input += char;
            readline.clearLine(stdout, 0);
            readline.cursorTo(stdout, 0);
            stdout.write(query + input);
          }
          break;
      }
    };
    
    stdin.on('data', onData);
  });
}

function askMode(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(query);
    
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    let input = '';
    
    const onData = (char) => {
      char = char.toString();
      
      switch (char) {
        case '\r':
        case '\n':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(input);
          break;
          
        case '\u0003':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          console.log('\nExit');
          process.exit(0);
          break;
          
        case '\u007f':
          if (input.length > 0) {
            input = input.slice(0, -1);
            readline.clearLine(stdout, 0);
            readline.cursorTo(stdout, 0);
            stdout.write(query + input);
          }
          break;
          
        default:
          if (char.charCodeAt(0) >= 32) {
            input += char;
            readline.clearLine(stdout, 0);
            readline.cursorTo(stdout, 0);
            stdout.write(query + input);
          }
          break;
      }
    };
    
    stdin.on('data', onData);
  });
}

function printLine(text) {
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  console.log(text);
  process.stdout.write('> ');
}

module.exports = { askHidden, askQuestion, askMode, printLine };