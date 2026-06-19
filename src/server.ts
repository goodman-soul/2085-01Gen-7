import 'reflect-metadata';
import app from './app';
import { AppDataSource } from './config/database';
import { LockerService } from './services/LockerService';
import { RentalService } from './services/RentalService';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    console.log('数据库连接成功');

    const lockerService = new LockerService();
    const rentalService = new RentalService();

    await lockerService.initializeLockers();
    console.log('储物柜初始化完成');

    await rentalService.initializeMembers();
    console.log('会员数据初始化完成');

    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`  体育馆更衣柜租用系统已启动`);
      console.log(`  服务地址: http://localhost:${PORT}`);
      console.log(`  健康检查: http://localhost:${PORT}/health`);
      console.log(`========================================\n`);

      console.log(`可用接口:`);
      console.log(`  GET    /api/lockers/available       - 获取可用储物柜`);
      console.log(`  GET    /api/lockers                 - 获取所有储物柜`);
      console.log(`  GET    /api/lockers/:number         - 获取储物柜信息`);
      console.log(`  POST   /api/rentals/create          - 创建租用`);
      console.log(`  POST   /api/rentals/open-code       - 生成开柜码`);
      console.log(`  POST   /api/rentals/open-code/use   - 使用开柜码`);
      console.log(`  POST   /api/rentals/:id/end         - 结束租用`);
      console.log(`  POST   /api/rentals/force-open      - 管理员强制开柜`);
      console.log(`  POST   /api/rentals/change-locker   - 换柜`);
      console.log(`  POST   /api/rentals/report-lost-item - 上报遗失物`);
      console.log(`  POST   /api/rentals/report-door-open - 上报柜门未关`);
      console.log(`  GET    /api/rentals/:id             - 获取租用详情`);
      console.log(`  GET    /api/audit                   - 获取审计日志`);
      console.log(`  GET    /api/members                 - 获取会员列表\n`);
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

bootstrap();
