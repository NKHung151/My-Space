package com.myspace.myspace.common.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

// Chạy tác vụ có tác dụng ra bên ngoài (xóa file Cloudinary, ghi Elasticsearch, đẩy WebSocket)
// chỉ SAU KHI transaction hiện tại commit thành công. Transaction rollback thì tác vụ bị bỏ.
// Không có transaction thì chạy ngay.

@Slf4j
public final class AfterCommit {

    private AfterCommit() {}

    public static void run(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    action.run();
                } catch (Exception e) {
                    // Transaction đã commit, không thể rollback nữa: chỉ ghi log
                    log.error("After-commit action failed: {}", e.getMessage(), e);
                }
            }
        });
    }
}
