const localtunnel = require('localtunnel');

const port = process.argv[2] || 5000;
const defaultSubdomain = `ems-vietnam-project-${port}-v3`;

const startTunnel = async () => {
  console.log(`Bắt đầu tạo đường hầm (tunnel) cho cổng ${port}...`);
  try {
    const tunnel = await localtunnel({ port: parseInt(port), subdomain: defaultSubdomain });
    console.log(`\n✅ THÀNH CÔNG! Dự án của bạn đã được đưa lên mạng.`);
    console.log(`🔗 Link truy cập công khai: ${tunnel.url}`);
    console.log(`\n(Đường hầm này có tính năng tự động khôi phục nếu bị ngắt kết nối)`);

    tunnel.on('close', () => {
      console.log('⚠️ Tunnel đã ngắt kết nối. Đang tự động kết nối lại...');
      setTimeout(startTunnel, 3000);
    });
  } catch (err) {
    console.error('❌ Lỗi khi tạo tunnel:', err.message);
    console.log('Thử kết nối lại sau 5 giây...');
    setTimeout(startTunnel, 5000);
  }
};

startTunnel();
