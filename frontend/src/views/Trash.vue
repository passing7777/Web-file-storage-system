<template>
  <div class="trash-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>回收站</h3>
          <el-button type="danger" @click="handleClearAll">清空回收站</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="fileList" style="width: 100%">
        <el-table-column prop="fileName" label="文件名" min-width="200" />
        <el-table-column prop="fileSize" label="大小" width="120">
          <template #default="{ row }">
            {{ formatFileSize(row.fileSize) }}
          </template>
        </el-table-column>
        <el-table-column prop="fileType" label="类型" width="150" />
        <el-table-column prop="deletedAt" label="删除时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.deletedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleRestore(row)">
              <el-icon><RefreshLeft /></el-icon>
              恢复
            </el-button>
            <el-button size="small" type="danger" @click="handlePermanentDelete(row)">
              <el-icon><Delete /></el-icon>
              永久删除
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
        @size-change="fetchTrashList"
        @current-change="fetchTrashList"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { fileApi } from '@/api/file';
import type { File } from '@/types/file';

const loading = ref(false);
const fileList = ref<File[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

onMounted(() => {
  fetchTrashList();
});

async function fetchTrashList() {
  loading.value = true;
  try {
    const response = await fileApi.getTrashList({
      page: currentPage.value,
      pageSize: pageSize.value,
    });
    fileList.value = response.items;
    total.value = response.total;
  } catch (error) {
    console.error('Fetch trash list failed:', error);
  } finally {
    loading.value = false;
  }
}

function handleRestore(row: File) {
  ElMessageBox.confirm(`确定要恢复文件"${row.fileName}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info',
  }).then(async () => {
    try {
      await fileApi.restore(row.id);
      ElMessage.success('文件已恢复');
      fetchTrashList();
    } catch (error) {
      console.error('Restore failed:', error);
    }
  });
}

function handlePermanentDelete(row: File) {
  ElMessageBox.confirm(
    `确定要永久删除文件"${row.fileName}"吗？此操作不可恢复！`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await fileApi.permanentDelete(row.id);
      ElMessage.success('文件已永久删除');
      fetchTrashList();
    } catch (error) {
      console.error('Permanent delete failed:', error);
    }
  });
}

function handleClearAll() {
  ElMessageBox.confirm('确定要清空回收站吗？此操作不可恢复！', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      for (const file of fileList.value) {
        await fileApi.permanentDelete(file.id);
      }
      ElMessage.success('回收站已清空');
      fetchTrashList();
    } catch (error) {
      console.error('Clear all failed:', error);
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
.trash-container {
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