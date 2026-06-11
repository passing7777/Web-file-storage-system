<template>
  <div class="files-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索文件"
              clearable
              style="width: 300px"
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="header-right">
            <el-upload
              ref="uploadRef"
              :show-file-list="false"
              :before-upload="beforeUpload"
              :http-request="handleUpload"
            >
              <el-button type="primary">
                <el-icon><Upload /></el-icon>
                上传文件
              </el-button>
            </el-upload>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="fileList"
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="fileName" label="文件名" min-width="200" sortable="custom" />
        <el-table-column prop="fileSize" label="大小" width="120" sortable="custom">
          <template #default="{ row }">
            {{ formatFileSize(row.fileSize) }}
          </template>
        </el-table-column>
        <el-table-column prop="fileType" label="类型" width="150" />
        <el-table-column prop="createdAt" label="上传时间" width="180" sortable="custom">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleDownload(row)">
              <el-icon><Download /></el-icon>
              下载
            </el-button>
            <el-button size="small" @click="handleShare(row)">
              <el-icon><Share /></el-icon>
              分享
            </el-button>
            <el-button size="small" @click="handleRename(row)">
              <el-icon><Edit /></el-icon>
              重命名
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
        @size-change="fetchFileList"
        @current-change="fetchFileList"
      />
    </el-card>

    <el-dialog v-model="renameDialogVisible" title="重命名文件" width="400px">
      <el-form :model="renameForm" label-width="80px">
        <el-form-item label="新文件名">
          <el-input v-model="renameForm.newName" placeholder="请输入新文件名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="renameLoading" @click="confirmRename">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="shareDialogVisible" title="创建分享链接" width="500px">
      <el-form :model="shareForm" label-width="100px">
        <el-form-item label="分享密码">
          <el-input
            v-model="shareForm.password"
            placeholder="可选，留空则无需密码"
            clearable
          />
        </el-form-item>
        <el-form-item label="最大访问次数">
          <el-input-number v-model="shareForm.maxViews" :min="1" :max="1000" />
        </el-form-item>
        <el-form-item label="有效期（小时）">
          <el-input-number v-model="shareForm.expiresIn" :min="1" :max="720" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shareDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="shareLoading" @click="confirmShare">
          创建分享
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="shareResultVisible" title="分享链接" width="500px">
      <el-form label-width="80px">
        <el-form-item label="分享链接">
          <el-input v-model="shareResultUrl" readonly>
            <template #append>
              <el-button @click="copyShareUrl">复制</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="过期时间">
          <span>{{ formatDate(shareResultExpires) }}</span>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { fileApi } from '@/api/file';
import { shareApi } from '@/api/share';
import type { File } from '@/types/file';

const loading = ref(false);
const fileList = ref<File[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const searchKeyword = ref('');
const sortBy = ref('createdAt');
const sortOrder = ref<'asc' | 'desc'>('desc');

const renameDialogVisible = ref(false);
const renameLoading = ref(false);
const renameForm = reactive({
  fileId: 0,
  newName: '',
});

const shareDialogVisible = ref(false);
const shareLoading = ref(false);
const shareForm = reactive({
  fileId: 0,
  password: '',
  maxViews: 100,
  expiresIn: 24,
});

const shareResultVisible = ref(false);
const shareResultUrl = ref('');
const shareResultExpires = ref('');

onMounted(() => {
  fetchFileList();
});

async function fetchFileList() {
  loading.value = true;
  try {
    const response = await fileApi.getList({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    });
    fileList.value = response.items;
    total.value = response.total;
  } catch (error) {
    console.error('Fetch file list failed:', error);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  fetchFileList();
}

function handleSortChange({ prop, order }: any) {
  if (prop && order) {
    sortBy.value = prop;
    sortOrder.value = order === 'ascending' ? 'asc' : 'desc';
    fetchFileList();
  }
}

function beforeUpload(file: File) {
  const maxSize = 500 * 1024 * 1024;
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过500MB');
    return false;
  }
  return true;
}

async function handleUpload(options: any) {
  try {
    await fileApi.upload(options.file);
    ElMessage.success('上传成功');
    fetchFileList();
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

function handleDownload(row: File) {
  fileApi.download(row.id);
}

function handleRename(row: File) {
  renameForm.fileId = row.id;
  renameForm.newName = row.fileName;
  renameDialogVisible.value = true;
}

async function confirmRename() {
  renameLoading.value = true;
  try {
    await fileApi.rename(renameForm.fileId, renameForm.newName);
    ElMessage.success('重命名成功');
    renameDialogVisible.value = false;
    fetchFileList();
  } catch (error) {
    console.error('Rename failed:', error);
  } finally {
    renameLoading.value = false;
  }
}

function handleDelete(row: File) {
  ElMessageBox.confirm(`确定要删除文件"${row.fileName}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await fileApi.delete(row.id);
      ElMessage.success('删除成功，文件已移至回收站');
      fetchFileList();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  });
}

function handleShare(row: File) {
  shareForm.fileId = row.id;
  shareForm.password = '';
  shareForm.maxViews = 100;
  shareForm.expiresIn = 24;
  shareDialogVisible.value = true;
}

async function confirmShare() {
  shareLoading.value = true;
  try {
    const response = await shareApi.create({
      fileId: shareForm.fileId,
      password: shareForm.password || undefined,
      maxViews: shareForm.maxViews,
      expiresIn: shareForm.expiresIn,
    });
    shareDialogVisible.value = false;
    shareResultUrl.value = `${window.location.origin}${response.shareUrl}`;
    shareResultExpires.value = response.expiresAt;
    shareResultVisible.value = true;
    ElMessage.success('分享链接创建成功');
  } catch (error) {
    console.error('Share failed:', error);
  } finally {
    shareLoading.value = false;
  }
}

function copyShareUrl() {
  navigator.clipboard.writeText(shareResultUrl.value);
  ElMessage.success('链接已复制到剪贴板');
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
.files-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>