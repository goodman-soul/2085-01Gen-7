import { Router, Request, Response } from 'express';
import { LockerService } from '../services/LockerService';
import { LockerStatus } from '../types';

const router = Router();
const lockerService = new LockerService();

router.get('/available', async (req: Request, res: Response) => {
  try {
    const lockers = await lockerService.getAvailableLockers();
    res.json({
      success: true,
      data: lockers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取可用储物柜失败',
    });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const lockers = await lockerService.getAllLockers();
    res.json({
      success: true,
      data: lockers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取储物柜列表失败',
    });
  }
});

router.get('/:lockerNumber', async (req: Request, res: Response) => {
  try {
    const { lockerNumber } = req.params;
    const locker = await lockerService.getLockerByNumber(lockerNumber);

    if (!locker) {
      return res.status(404).json({
        success: false,
        error: '储物柜不存在',
      });
    }

    res.json({
      success: true,
      data: locker,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取储物柜信息失败',
    });
  }
});

router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(LockerStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: '无效的状态值',
      });
    }

    const locker = await lockerService.updateLockerStatus(id, status);

    if (!locker) {
      return res.status(404).json({
        success: false,
        error: '储物柜不存在',
      });
    }

    res.json({
      success: true,
      data: locker,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新储物柜状态失败',
    });
  }
});

export default router;
