import chalk from 'chalk';

export const logColor=(text, color)=> {
  if (chalk[color]) {
    console.log(chalk[color](text));
  } else {
    console.log(text);
  }
}

// 调用示例
// logColor('红色文本', 'red');
// logColor('绿色文本', 'green');
// logColor('蓝色文本', 'blue');
// logColor('加粗文本', 'bold');
// logColor('下划线文本', 'underline');

