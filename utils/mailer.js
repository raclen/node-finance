// 使用163邮箱发送邮件到QQ邮箱

import nodemailer from 'nodemailer';
import { escape } from 'querystring';

// 创建一个SMTP客户端配置
const transporter = nodemailer.createTransport({
  host: 'smtp.163.com',
  port: 465,
  secure: true,
  auth: {
    user: '29793@163.com',
    pass: 'WLWQvCjFj6G52faT'
  }
});

// 发送邮件
const sendMail = async (to, subject, text) => {
  const mailOptions = {
    from: '29793@163.com',
    to,
    subject,
    text
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('邮件发送成功');
  } catch (error) {
    console.error('邮件发送失败:', error);
  }
};

export { sendMail };

