import { supabase } from './supabase';

export interface FileUploadParams {
  file: File;
  companyId: string;
  category: 'rh' | 'veiculos' | 'documentos' | 'usuarios';
  userId: string;
}

export const uploadFile = async ({ file, companyId, category, userId }: FileUploadParams) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `empresa_${companyId}/${category}/${fileName}`;

    // 1. Upload para o Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('logta-files')
      .upload(filePath, file);

    if (storageError) throw storageError;

    // 2. Gerar URL pública (ou assinada, mas aqui usaremos pública se o bucket for público, 
    // ou usaremos a referência para gerar assinada depois)
    const { data: { publicUrl } } = supabase.storage
      .from('logta-files')
      .getPublicUrl(filePath);

    // 3. Salvar referência no Banco de Dados
    const { data: dbData, error: dbError } = await supabase
      .from('files')
      .insert([
        {
          company_id: companyId,
          user_id: userId,
          file_name: file.name,
          storage_path: filePath,
          url: publicUrl,
          category
        }
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return { data: dbData, url: publicUrl };
  } catch (error: any) {
    console.error('Erro no upload:', error.message);
    throw error;
  }
};

export const listCompanyFiles = async (companyId: string, category?: string) => {
  let query = supabase
    .from('files')
    .select('*')
    .eq('company_id', companyId);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};
