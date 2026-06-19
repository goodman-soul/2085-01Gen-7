import { Router, Request, Response } from 'express';
import { RentalService } from '../services/RentalService';

const router = Router();
const rentalService = new RentalService();

router.get('/', async (req: Request, res: Response) => {
  try {
    const members = await rentalService.getAllMembers();
    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取会员列表失败',
    });
  }
});

router.get('/:memberId', async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const member = await rentalService.getMemberById(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: '会员不存在',
      });
    }

    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取会员信息失败',
    });
  }
});

export default router;
