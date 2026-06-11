<template>
  <div class="profile-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>个人中心</h3>
        </div>
      </template>

      <el-form :model="userForm" label-width="120px" style="max-width: 600px">
        <el-form-item label="用户名">
          <el-input v-model="userForm.username" disabled />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" />
        </el-form-item>

        <el-form-item label="存储空间">
          <el-progress
            :percentage="storagePercentage"
            :format="() => storageFormat"
          />
        </el-form-item>

        <el-form-item label="账户状态">
          <el-tag :type="userForm.status === 'ACTIVE' ? 'success' : 'danger'">
            {{ userForm.status === 'ACTIVE' ? '正常' : '禁用' }}
          </el-tag>
        </el-form-item>

        <el-form-item label="注册时间">
          <span>{{ formatDate(userForm.createdAt) }}</span>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="updateLoading" @click="handleUpdateEmail">
            更新邮箱
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <h3>修改密码</h3>
        </div>
      </template>

      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="120px"
        style="max-width: 600px"
      >
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            placeholder="请输入旧密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少8字符）"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="passwordLoading"
            @click="handleUpdatePassword"
          >
            修改密码
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api/auth';

const authStore = useAuthStore();

const updateLoading = ref(false);
const passwordLoading = ref(false);
const passwordFormRef = ref<FormInstance>();

const userForm = reactive({
  username: '',
  email: '',
  status: '',
  storageLimit: 0,
  usedStorage: 0,
  createdAt: '',
});

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const validateConfirmPassword = (rule: any, value: any, callback: any) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
};

const passwordRules: FormRules = {
  oldPassword: [
    { required: true, message: '请输入旧密码', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, message: '密码至少8个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
};

const storagePercentage = computed(() => {
  if (userForm.storageLimit === 0) return 0;
  return Math.round((userForm.usedStorage / userForm.storageLimit) * 100);
});

const storageFormat = computed(() => {
  const used = formatFileSize(userForm.usedStorage);
  const limit = formatFileSize(userForm.storageLimit);
  return `${used} / ${limit}`;
});

onMounted(async () => {
  await fetchProfile();
});

async function fetchProfile() {
  try {
    const response = await authStore.fetchProfile();
    userForm.username = response.username;
    userForm.email = response.email || '';
    userForm.status = response.status;
    userForm.storageLimit = response.storageLimit;
    userForm.usedStorage = response.usedStorage || 0;
    userForm.createdAt = response.createdAt;
  } catch (error) {
    console.error('Fetch profile failed:', error);
  }
}

async function handleUpdateEmail() {
  updateLoading.value = true;
  try {
    await authApi.updateEmail(userForm.email);
    ElMessage.success('邮箱更新成功');
    fetchProfile();
  } catch (error) {
    console.error('Update email failed:', error);
  } finally {
    updateLoading.value = false;
  }
}

async function handleUpdatePassword() {
  if (!passwordFormRef.value) return;

  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      passwordLoading.value = true;
      try {
        await authApi.updatePassword(
          passwordForm.oldPassword,
          passwordForm.newPassword
        );
        ElMessage.success('密码修改成功');
        passwordFormRef.value?.resetFields();
      } catch (error) {
        console.error('Update password failed:', error);
      } finally {
        passwordLoading.value = false;
      }
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
.profile-container {
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