import chalk from 'chalk';

export const logColor=(text, color)=> {
  if (chalk[color]) {
    console.log(chalk[color](text));
  } else {
    console.log(text);
  }
}



