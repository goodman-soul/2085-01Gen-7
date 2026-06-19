import { Router, Request, Response } from 'express';
import { RentalService } from '../services/RentalService';
import { LockerService } from '../services/LockerService';
import {
  CreateRentalRequest,
  GenerateOpenCodeRequest,
  ForceOpenRequest,
  ChangeLockerRequest,
  ReportLostItemRequest,
  ReportDoorOpenRequest,
  RentalStatus,
} from '../types';

const router = Router();
const rentalService = new RentalService();
const lockerService = new LockerService();

router.post('/create', async (req: Request, res: Response) => {
  try {
    const request: CreateRentalRequest = req.body;

    if (!request.memberId || !request.lockerNumber || !request.durationHours) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：memberId, lockerNumber, durationHours',
      });
    }

    const rental = await rentalService.createRental(request);

    res.json({
      success: true,
      data: rental,
      message: '租用创建成功',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '创建租用失败',
    });
  }
});

router.post('/open-code', async (req: Request, res: Response) => {
  try {
    const request: GenerateOpenCodeRequest = req.body;

    if (!request.rentalId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：rentalId',
      });
    }

    const openCode = await rentalService.generateOpenCode(request);

    res.json({
      success: true,
      data: {
        code: openCode.code,
        expiresAt: openCode.expiresAt,
      },
      message: '开柜码生成成功，15分钟内有效',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '生成开柜码失败',
    });
  }
});

router.post('/open-code/use', async (req: Request, res: Response) => {
  try {
    const { rentalId, code } = req.body;

    if (!rentalId || !code) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：rentalId, code',
      });
    }

    await rentalService.useOpenCode(rentalId, code);

    res.json({
      success: true,
      message: '开柜成功',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '使用开柜码失败',
    });
  }
});

router.post('/:rentalId/end', async (req: Request, res: Response) => {
  try {
    const { rentalId } = req.params;

    const rental = await rentalService.endRental(rentalId);

    res.json({
      success: true,
      data: rental,
      message: '租用结束成功',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '结束租用失败',
    });
  }
});

router.post('/force-open', async (req: Request, res: Response) => {
  try {
    const request: ForceOpenRequest = req.body;

    if (!request.lockerNumber || !request.operatorId || !request.reason) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：lockerNumber, operatorId, reason',
      });
    }

    await rentalService.forceOpen(request);

    res.json({
      success: true,
      message: '强制开柜已记录',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '强制开柜失败',
    });
  }
});

router.post('/change-locker', async (req: Request, res: Response) => {
  try {
    const request: ChangeLockerRequest = req.body;

    if (!request.rentalId || !request.newLockerNumber || !request.operatorId || !request.reason) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：rentalId, newLockerNumber, operatorId, reason',
      });
    }

    const rental = await rentalService.changeLocker(request);

    res.json({
      success: true,
      data: rental,
      message: '换柜成功',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '换柜失败',
    });
  }
});

router.post('/report-lost-item', async (req: Request, res: Response) => {
  try {
    const request: ReportLostItemRequest = req.body;

    if (!request.rentalId || !request.description || !request.reporterId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：rentalId, description, reporterId',
      });
    }

    await rentalService.reportLostItem(request);

    res.json({
      success: true,
      message: '遗失物已上报',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '上报遗失物失败',
    });
  }
});

router.post('/report-door-open', async (req: Request, res: Response) => {
  try {
    const request: ReportDoorOpenRequest = req.body;

    if (!request.lockerNumber || !request.reporterId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：lockerNumber, reporterId',
      });
    }

    await rentalService.reportDoorOpen(request);

    res.json({
      success: true,
      message: '柜门未关已上报',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '上报柜门未关失败',
    });
  }
});

router.get('/:rentalId', async (req: Request, res: Response) => {
  try {
    const { rentalId } = req.params;
    const rental = await rentalService.getRentalById(rentalId);

    if (!rental) {
      return res.status(404).json({
        success: false,
        error: '租用记录不存在',
      });
    }

    const overtimeInfo = lockerService.calculateCurrentOvertime(
      rental.startTime,
      (rental.expectedEndTime.getTime() - rental.startTime.getTime()) / (1000 * 60 * 60),
      rental.locker.overtimeRate
    );

    res.json({
      success: true,
      data: {
        ...rental,
        currentOvertime: overtimeInfo,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取租用信息失败',
    });
  }
});

router.get('/member/:memberId', async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { status } = req.query;

    const rentals = await rentalService.getMemberRentals(
      memberId,
      status as RentalStatus | undefined
    );

    res.json({
      success: true,
      data: rentals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取会员租用记录失败',
    });
  }
});

router.get('/locker/:lockerNumber/active', async (req: Request, res: Response) => {
  try {
    const { lockerNumber } = req.params;
    const rental = await rentalService.getActiveRentalByLocker(lockerNumber);

    res.json({
      success: true,
      data: rental,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取储物柜当前租用信息失败',
    });
  }
});

router.post('/check-overdue', async (req: Request, res: Response) => {
  try {
    await rentalService.checkAndUpdateOverdue();

    res.json({
      success: true,
      message: '超时检查完成',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '超时检查失败',
    });
  }
});

export default router;
