import { supabase } from '../lib/supabase'

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  created_at: string
}

export class StorageService {
  // Upload user asset (images, etc.)
  static async uploadAsset(file: File, folder: string = 'general'): Promise<UploadedFile> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${user.id}/${folder}/${fileName}`

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('user-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Error uploading file:', error)
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-assets')
        .getPublicUrl(filePath)

      return {
        id: data.path,
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        created_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error in uploadAsset:', error)
      throw error
    }
  }

  // Get user's uploaded assets
  static async getUserAssets(folder?: string): Promise<UploadedFile[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const folderPath = folder ? `${user.id}/${folder}` : user.id

      const { data, error } = await supabase.storage
        .from('user-assets')
        .list(folderPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        console.error('Error listing assets:', error)
        throw error
      }

      // Convert to UploadedFile format
      const assets: UploadedFile[] = (data || [])
        .filter(item => item.name && !item.name.endsWith('/')) // Filter out folders
        .map(item => {
          const filePath = `${folderPath}/${item.name}`
          const { data: { publicUrl } } = supabase.storage
            .from('user-assets')
            .getPublicUrl(filePath)

          return {
            id: filePath,
            name: item.name || 'Unknown',
            size: item.metadata?.size || 0,
            type: item.metadata?.mimetype || 'unknown',
            url: publicUrl,
            created_at: item.created_at || new Date().toISOString()
          }
        })

      return assets
    } catch (error) {
      console.error('Error in getUserAssets:', error)
      throw error
    }
  }

  // Delete user asset
  static async deleteAsset(filePath: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Ensure user can only delete their own files
      if (!filePath.startsWith(user.id)) {
        throw new Error('Unauthorized: Cannot delete file')
      }

      const { error } = await supabase.storage
        .from('user-assets')
        .remove([filePath])

      if (error) {
        console.error('Error deleting asset:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteAsset:', error)
      throw error
    }
  }

  // Export workflow as JSON
  static async exportWorkflow(workflow: any, filename?: string): Promise<UploadedFile> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const exportData = {
        workflow,
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
        version: '1.0'
      }

      // Create JSON blob
      const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })

      // Generate filename
      const exportFilename = filename || `workflow-${workflow.name}-${Date.now()}.json`
      const filePath = `${user.id}/exports/${exportFilename}`

      // Upload to workflow-exports bucket
      const { data, error } = await supabase.storage
        .from('workflow-exports')
        .upload(filePath, jsonBlob, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        console.error('Error exporting workflow:', error)
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('workflow-exports')
        .getPublicUrl(filePath)

      return {
        id: data.path,
        name: exportFilename,
        size: jsonBlob.size,
        type: 'application/json',
        url: publicUrl,
        created_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error in exportWorkflow:', error)
      throw error
    }
  }

  // Get user's workflow exports
  static async getUserExports(): Promise<UploadedFile[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const folderPath = `${user.id}/exports`

      const { data, error } = await supabase.storage
        .from('workflow-exports')
        .list(folderPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        console.error('Error listing exports:', error)
        throw error
      }

      // Convert to UploadedFile format
      const exports: UploadedFile[] = (data || [])
        .filter(item => item.name && !item.name.endsWith('/'))
        .map(item => {
          const filePath = `${folderPath}/${item.name}`
          const { data: { publicUrl } } = supabase.storage
            .from('workflow-exports')
            .getPublicUrl(filePath)

          return {
            id: filePath,
            name: item.name || 'Unknown',
            size: item.metadata?.size || 0,
            type: 'application/json',
            url: publicUrl,
            created_at: item.created_at || new Date().toISOString()
          }
        })

      return exports
    } catch (error) {
      console.error('Error in getUserExports:', error)
      throw error
    }
  }

  // Import workflow from JSON file
  static async importWorkflow(file: File): Promise<any> {
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Validate the imported data structure
      if (!data.workflow) {
        throw new Error('Invalid workflow file: missing workflow data')
      }

      return data.workflow
    } catch (error) {
      console.error('Error in importWorkflow:', error)
      throw error
    }
  }

  // Download file
  static async downloadFile(filePath: string, bucketName: 'user-assets' | 'workflow-exports'): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Ensure user can only download their own files
      if (!filePath.startsWith(user.id)) {
        throw new Error('Unauthorized: Cannot download file')
      }

      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath)

      if (error) {
        console.error('Error downloading file:', error)
        throw error
      }

      // Create download link
      const url = URL.createObjectURL(data)
      const filename = filePath.split('/').pop() || 'download'
      
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error in downloadFile:', error)
      throw error
    }
  }

  // Get storage usage for user
  static async getStorageUsage(): Promise<{ assets: number; exports: number; total: number }> {
    try {
      const [assets, exports] = await Promise.all([
        this.getUserAssets(),
        this.getUserExports()
      ])

      const assetsSize = assets.reduce((total, file) => total + file.size, 0)
      const exportsSize = exports.reduce((total, file) => total + file.size, 0)

      return {
        assets: assetsSize,
        exports: exportsSize,
        total: assetsSize + exportsSize
      }
    } catch (error) {
      console.error('Error in getStorageUsage:', error)
      return { assets: 0, exports: 0, total: 0 }
    }
  }

  // Format file size
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
} 