import { Router, Request, Response } from 'express';
import { AuditService } from '../services/AuditService';
import { AuditLogType } from '../types';

const router = Router();
const auditService = new AuditService();

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const type = req.query.type as AuditLogType | undefined;
    const lockerNumber = req.query.lockerNumber as string | undefined;
    const memberId = req.query.memberId as string | undefined;
    const operatorId = req.query.operatorId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await auditService.getLogs(page, pageSize, {
      type,
      lockerNumber,
      memberId,
      operatorId,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: {
        logs: result.logs,
        pagination: {
          page,
          pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / pageSize),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取审计日志失败',
    });
  }
});

router.get('/types', async (req: Request, res: Response) => {
  try {
    const types = Object.values(AuditLogType);
    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取审计日志类型失败',
    });
  }
});

export default router;
