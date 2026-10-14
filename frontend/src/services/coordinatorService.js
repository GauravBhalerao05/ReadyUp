import { apiClient } from './apiClient';

export const coordinatorService = {
  async getDashboard() {
    const res = await apiClient.request('/coordinator/dashboard', { method: 'GET' });
    return res.data;
  },

  async downloadTemplate(format = 'xlsx') {
    // Generate CSV template client-side or call backend
    const csvContent = [
      'questionId,questionText,optionA,optionB,optionC,optionD,correctOption,explanation,category,topic,subtopic,difficulty,companies,source,year',
      'QA-TW-001,"A can do a work in 12 days, B in 18 days. Fraction left after 4 days?","4/9","5/9","1/3","2/5",A,"1 - 4*(5/36) = 4/9","Quantitative Aptitude","Time and Work","Combined Work",easy,"TCS, Infosys","TCS NQT 2024",2024'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `readyup_questions_template.${format === 'xlsx' ? 'csv' : 'csv'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  async previewImport(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.request('/coordinator/import/preview', {
      method: 'POST',
      data: formData,
      isMultipart: true
    });
    return res.data;
  },

  async confirmImport(importBatchId) {
    const res = await apiClient.request('/coordinator/import/confirm', {
      method: 'POST',
      data: { importBatchId }
    });
    return res.data;
  },

  async getImportHistory() {
    const res = await apiClient.request('/coordinator/import/history', { method: 'GET' });
    return res.data;
  }
};
