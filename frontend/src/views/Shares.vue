<template>
  <div class="shares-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>我的分享</h3>
        </div>
      </template>

      <el-table v-loading="loading" :data="shareList" style="width: 100%">
        <el-table-column prop="shareCode" label="分享码" width="150" />
        <el-table-column prop="fileName" label="文件名" min-width="200" />
        <el-table-column prop="fileSize" label="文件大小" width="120">
          <template #default="{ row }">
            {{ formatFileSize(row.fileSize) }}
          </template>
        </el-table-column>
        <el-table-column prop="viewCount" label="访问次数" width="120">
          <template #default="{ row }">
            {{ row.viewCount }} / {{ row.maxViews }}
          </template>
        </el-table-column>
        <el-table-column prop="expiresAt" label="过期时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.expiresAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleCopyLink(row)">
              <el-icon><Link /></el-icon>
              复制链接
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        @size-change="fetchShareList"
        @current-change="fetchShareList"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { shareApi } from '@/api/share';
import type { Share } from '@/types/share';

const loading = ref(false);
const shareList = ref<Share[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

onMounted(() => {
  fetchShareList();
});

async function fetchShareList() {
  loading.value = true;
  try {
    const response = await shareApi.getList({
      page: currentPage.value,
      pageSize: pageSize.value,
    });
    shareList.value = response.items;
    total.value = response.total;
  } catch (error) {
    console.error('Fetch share list failed:', error);
  } finally {
    loading.value = false;
  }
}

function handleCopyLink(row: Share) {
  const shareUrl = `${window.location.origin}/share/${row.shareCode}`;
  navigator.clipboard.writeText(shareUrl);
  ElMessage.success('分享链接已复制到剪贴板');
}

function handleDelete(row: Share) {
  ElMessageBox.confirm(`确定要删除分享链接"${row.shareCode}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await shareApi.delete(row.id);
      ElMessage.success('分享链接已删除');
      fetchShareList();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('zh-CN');
}
</script>

<style scoped>
.shares-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
}
</style>