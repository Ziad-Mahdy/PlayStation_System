import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const subscriptionService = {
  // ── تسجيل دخول والتحقق من المشترك ──
  async loginAndVerifyClient(phone, code) {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'قاعدة بيانات Supabase غير متصلة' };
    }

    try {
      const cleanPhone = (phone || '').trim();
      const cleanCode = (code || '').trim().toUpperCase();

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('phone', cleanPhone)
        .eq('code', cleanCode)
        .maybeSingle();

      if (error || !data) {
        return { success: false, message: 'رقم الهاتف أو كود الاشتراك غير صحيح' };
      }

      if (data.is_suspended) {
        return {
          success: false,
          message: 'تم إيقاف هذا الاشتراك مؤقتاً من قبل الإدارة، يرجى التواصل مع الدعم.',
        };
      }

      // ── أول تسجيل دخول: تفعيل الكود وبدء العداد ──
      if (!data.is_active || !data.activated_at) {
        const now = new Date();
        const durationDays = Number(data.duration_days) || 30;
        const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        const { data: activatedClient, error: updateErr } = await supabase
          .from('subscriptions')
          .update({
            is_active: true,
            activated_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', data.id)
          .select()
          .single();

        if (updateErr) {
          console.error('Error activating client subscription:', updateErr);
          return { success: false, message: 'حدث خطأ أثناء تفعيل الاشتراك' };
        }

        return { success: true, client: activatedClient, isNewActivation: true };
      }

      // ── الكود مفعل مسبقاً: فحص تاريخ الانتهاء ──
      const now = new Date();
      const expiry = new Date(data.expires_at);

      if (now > expiry) {
        return {
          success: false,
          message: 'انتهت مدة اشتراك هذا الكود. يرجى التواصل مع الإدارة لتجديد الاشتراك.',
          isExpired: true,
        };
      }

      return { success: true, client: data, isNewActivation: false };
    } catch (err) {
      console.error('Exception during client login:', err);
      return { success: false, message: 'فشل الاتصال بالخادم، يرجى المحاولة لاحقاً' };
    }
  },

  // ── جلب حالة عميل محدد ──
  async fetchClientStatus(phone) {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('phone', (phone || '').trim())
        .maybeSingle();
      if (error) return null;
      return data;
    } catch (err) {
      console.error('fetchClientStatus exception:', err);
      return null;
    }
  },

  // ── [للمطور] جلب قائمة جميع المشتركين ──
  async fetchAllSubscribers() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Error fetching subscribers:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('fetchAllSubscribers exception:', err);
      return [];
    }
  },

  // ── [للمطور] إضافة مشترك جديد ──
  async createSubscriber(subscriberData) {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          client_name: subscriberData.client_name.trim(),
          shop_name: subscriberData.shop_name.trim(),
          phone: subscriberData.phone.trim(),
          code: subscriberData.code.trim().toUpperCase(),
          duration_days: Number(subscriberData.duration_days) || 30,
          admin_password: subscriberData.admin_password?.trim() || 'Admin@123',
          notes: subscriberData.notes?.trim() || '',
          is_active: false,
          is_suspended: false,
          activated_at: null,
          expires_at: null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating subscriber:', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('createSubscriber exception:', err);
      throw err;
    }
  },

  // ── [للمطور] تمديد / تعديل مدة الاشتراك ──
  async extendSubscriber(id, extraDays) {
    if (!isSupabaseConfigured) return null;
    try {
      // جلب البيانات الحالية
      const { data: current, error: getErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single();

      if (getErr || !current) return null;

      let newExpiresAt = null;
      const newDurationDays = Math.max(1, (current.duration_days || 0) + Number(extraDays));

      if (current.expires_at) {
        const currentExpiry = new Date(current.expires_at);
        // إذا كان منتهياً، نبدأ التمديد من لحظة الآن
        const baseTime = currentExpiry > new Date() ? currentExpiry.getTime() : Date.now();
        newExpiresAt = new Date(baseTime + Number(extraDays) * 24 * 60 * 60 * 1000).toISOString();
      }

      const payload = { duration_days: newDurationDays };
      if (newExpiresAt) payload.expires_at = newExpiresAt;

      const { data: updated, error: updateErr } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return updated;
    } catch (err) {
      console.error('extendSubscriber exception:', err);
      throw err;
    }
  },

  // ── [للمطور] إيقاف / تشغيل الاشتراك ──
  async toggleSuspend(id, currentSuspendedStatus) {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ is_suspended: !currentSuspendedStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('toggleSuspend exception:', err);
      throw err;
    }
  },

  // ── [للمطور] تعديل كلمة مرور لوحة الأدمن للعميل ──
  async updateAdminPassword(id, newPassword) {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ admin_password: newPassword.trim() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('updateAdminPassword exception:', err);
      throw err;
    }
  },

  // ── [للمطور] حذف عميل ──
  async deleteSubscriber(id) {
    if (!isSupabaseConfigured) return false;
    try {
      const { error } = await supabase.from('subscriptions').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('deleteSubscriber exception:', err);
      throw err;
    }
  },

  // ── الاستماع للتغييرات اللحظية للاشتراكات ──
  subscribeToSubscriptions(onChange) {
    if (!isSupabaseConfigured || !supabase) return () => {};
    try {
      const channel = supabase
        .channel('subscriptions-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'subscriptions' },
          (payload) => onChange?.(payload)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error('subscribeToSubscriptions error:', err);
      return () => {};
    }
  },
};
