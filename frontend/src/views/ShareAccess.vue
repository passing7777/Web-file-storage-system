<template>
  <div class="share-access-container">
    <el-card class="share-card">
      <template #header>
        <div class="card-header">
          <h2>文件分享</h2>
        </div>
      </template>

      <div v-if="!fileInfo" class="password-form">
        <el-form :model="passwordForm" label-width="80px">
          <el-form-item label="分享密码">
            <el-input
              v-model="passwordForm.password"
              type="password"
              placeholder="请输入分享密码"
              show-password
              @keyup.enter="handleAccess"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :loading="loading"
              @click="handleAccess"
              style="width: 100%"
            >
              访问文件
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <div v-else class="file-info">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="文件名">
            {{ fileInfo.fileName }}
          </el-descriptions-item>
          <el-descriptions-item label="文件大小">
            {{ formatFileSize(fileInfo.fileSize) }}
          </el-descriptions-item>
          <el-descriptions-item label="文件类型">
            {{ fileInfo.fileType }}
          </el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 20px; text-align: center">
          <el-button type="primary" size="large" @click="handleDownload">
            <el-icon><Download /></el-icon>
            下载文件
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { shareApi } from '@/api/share';
import type { ShareAccessResponse } from '@/types/share';

const route = useRoute();

const loading = ref(false);
const fileInfo = ref<ShareAccessResponse | null>(null);
const passwordForm = reactive({
  password: '',
});

onMounted(() => {
  const shareCode = route.params.shareCode as string;
  if (shareCode) {
    handleAccess();
  }
});

async function handleAccess() {
  loading.value = true;
  try {
    const shareCode = route.params.shareCode as string;
    const response = await shareApi.access(
      shareCode,
      passwordForm.password || undefined
    );
    fileInfo.value = response;
  } catch (error) {
    console.error('Access share failed:', error);
  } finally {
    loading.value = false;
  }
}

function handleDownload() {
  const shareCode = route.params.shareCode as string;
  shareApi.download(shareCode, passwordForm.password || undefined);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
</script>

<style scoped>
.share-access-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.share-card {
  width: 500px;
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0;
  color: #303133;
}

.password-form {
  padding: 20px 0;
}

.file-info {
  padding: 20px 0;
}
</style>