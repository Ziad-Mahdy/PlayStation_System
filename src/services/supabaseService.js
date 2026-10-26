import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const supabaseService = {
  // ── Devices ──
  async fetchDevices(clientPhone = 'default') {
    if (!isSupabaseConfigured) return [];
    try {
      // 1. محاولة الجلب برقم هاتف العميل
      let { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('client_phone', clientPhone)
        .order('id', { ascending: true });

      // 2. إذا كان عمود client_phone غير موجود في الجدول، نجلب الأجهزة مباشرة
      if (error && error.code === '42703') {
        const fallback = await supabase
          .from('devices')
          .select('*')
          .order('id', { ascending: true });
        data = fallback.data;
        error = fallback.error;
      } else if (!error && (!data || data.length === 0)) {
        // إذا لم توجد أجهزة مخصصة لهذا الرقم، نجلب الأجهزة العامة أو الافتراضية
        const fallback = await supabase
          .from('devices')
          .select('*')
          .or(`client_phone.eq.default,client_phone.is.null`)
          .order('id', { ascending: true });
        if (fallback.data && fallback.data.length > 0) {
          data = fallback.data;
        } else {
          // جلب كل الأجهزة كحل أخير لضمان عدم ضياع أي جهاز
          const all = await supabase.from('devices').select('*').order('id', { ascending: true });
          if (all.data && all.data.length > 0) data = all.data;
        }
      }

      if (error || !data) {
        console.error('Error fetching devices from Supabase:', error);
        return [];
      }

      return data.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        isVIP: Boolean(d.is_vip),
        singlePrice: parseFloat(d.single_price) || 0,
        multiPrice: parseFloat(d.multi_price) || 0,
        status: d.status || 'free',
        session: d.session || null,
        clientPhone: d.client_phone || clientPhone,
      }));
    } catch (err) {
      console.error('Supabase fetchDevices exception:', err);
      return [];
    }
  },

  async upsertDevice(device, clientPhone = 'default') {
    if (!isSupabaseConfigured) return null;
    try {
      const payload = {
        name: device.name,
        type: device.type,
        is_vip: device.isVIP,
        single_price: device.singlePrice,
        multi_price: device.multiPrice,
        status: device.status,
        session: device.session,
      };

      // محاولة الحفظ بـ client_phone أولاً
      let res = await supabase
        .from('devices')
        .upsert({ ...payload, client_phone: clientPhone }, { onConflict: 'client_phone,name' })
        .select()
        .single();

      // لو عمود client_phone مش موجود أو القيد على name فقط
      if (res.error) {
        res = await supabase
          .from('devices')
          .upsert(payload, { onConflict: 'name' })
          .select()
          .single();
      }

      return res.data;
    } catch (err) {
      console.error('Supabase upsertDevice exception:', err);
      return null;
    }
  },

  async deleteDevice(deviceName, clientPhone = 'default') {
    if (!isSupabaseConfigured) return;
    try {
      let query = supabase.from('devices').delete().eq('name', deviceName);
      // تجربة الحذف بـ client_phone إن وجد
      const res = await query.eq('client_phone', clientPhone);
      if (res.error && res.error.code === '42703') {
        await supabase.from('devices').delete().eq('name', deviceName);
      }
    } catch (err) {
      console.error('Supabase deleteDevice exception:', err);
    }
  },

  // ── Categories ──
  async fetchCategories(clientPhone = 'default') {
    if (!isSupabaseConfigured) return [];
    try {
      let { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('client_phone', clientPhone)
        .order('id', { ascending: true });

      if (error && error.code === '42703') {
        const fallback = await supabase
          .from('categories')
          .select('name')
          .order('id', { ascending: true });
        data = fallback.data;
        error = fallback.error;
      } else if (!error && (!data || data.length === 0)) {
        const fallback = await supabase
          .from('categories')
          .select('name')
          .or(`client_phone.eq.default,client_phone.is.null`)
          .order('id', { ascending: true });
        if (fallback.data && fallback.data.length > 0) data = fallback.data;
        else {
          const all = await supabase.from('categories').select('name').order('id', { ascending: true });
          if (all.data && all.data.length > 0) data = all.data;
        }
      }

      if (error || !data) return [];
      return data.map((c) => c.name);
    } catch (err) {
      console.error('Supabase fetchCategories exception:', err);
      return [];
    }
  },

  async addCategory(name, clientPhone = 'default') {
    if (!isSupabaseConfigured) return;
    try {
      let res = await supabase.from('categories').insert({ name, client_phone: clientPhone });
      if (res.error && res.error.code === '42703') {
        await supabase.from('categories').insert({ name });
      }
    } catch (err) {
      console.error('Supabase addCategory exception:', err);
    }
  },

  async deleteCategory(name, clientPhone = 'default') {
    if (!isSupabaseConfigured) return;
    try {
      let res = await supabase.from('categories').delete().eq('name', name).eq('client_phone', clientPhone);
      if (res.error && res.error.code === '42703') {
        await supabase.from('categories').delete().eq('name', name);
      }
    } catch (err) {
      console.error('Supabase deleteCategory exception:', err);
    }
  },

  // ── Products (Buffet) ──
  async fetchProducts(clientPhone = 'default') {
    if (!isSupabaseConfigured) return [];
    try {
      let { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('client_phone', clientPhone)
        .order('id', { ascending: true });

      if (error && error.code === '42703') {
        const fallback = await supabase
          .from('products')
          .select('*')
          .order('id', { ascending: true });
        data = fallback.data;
        error = fallback.error;
      } else if (!error && (!data || data.length === 0)) {
        const fallback = await supabase
          .from('products')
          .select('*')
          .or(`client_phone.eq.default,client_phone.is.null`)
          .order('id', { ascending: true });
        if (fallback.data && fallback.data.length > 0) data = fallback.data;
        else {
          const all = await supabase.from('products').select('*').order('id', { ascending: true });
          if (all.data && all.data.length > 0) data = all.data;
        }
      }

      if (error || !data) return [];
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        price: parseFloat(p.price) || 0,
        category: p.category || 'مشروبات',
        clientPhone: p.client_phone,
      }));
    } catch (err) {
      console.error('Supabase fetchProducts exception:', err);
      return [];
    }
  },

  async addProduct(product, clientPhone = 'default') {
    if (!isSupabaseConfigured) return null;
    try {
      let res = await supabase
        .from('products')
        .insert({
          client_phone: clientPhone,
          name: product.name,
          price: product.price,
          category: product.category,
        })
        .select()
        .single();

      if (res.error && res.error.code === '42703') {
        res = await supabase
          .from('products')
          .insert({
            name: product.name,
            price: product.price,
            category: product.category,
          })
          .select()
          .single();
      }

      return res.data;
    } catch (err) {
      console.error('Supabase addProduct exception:', err);
      return null;
    }
  },

  async updateProduct(id, updates) {
    if (!isSupabaseConfigured) return;
    try {
      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.price !== undefined) payload.price = updates.price;
      if (updates.category !== undefined) payload.category = updates.category;

      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) console.error('Error updating product:', error);
    } catch (err) {
      console.error('Supabase updateProduct exception:', err);
    }
  },

  async deleteProduct(id) {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) console.error('Error deleting product:', error);
    } catch (err) {
      console.error('Supabase deleteProduct exception:', err);
    }
  },

  // ── Completed Sessions / Invoices ──
  async fetchCompletedSessions(clientPhone = 'default') {
    if (!isSupabaseConfigured) return [];
    try {
      let { data, error } = await supabase
        .from('completed_sessions')
        .select('*')
        .eq('client_phone', clientPhone)
        .order('id', { ascending: true });

      if (error && error.code === '42703') {
        const fallback = await supabase
          .from('completed_sessions')
          .select('*')
          .order('id', { ascending: true });
        data = fallback.data;
        error = fallback.error;
      } else if (!error && (!data || data.length === 0)) {
        const fallback = await supabase
          .from('completed_sessions')
          .select('*')
          .or(`client_phone.eq.default,client_phone.is.null`)
          .order('id', { ascending: true });
        if (fallback.data && fallback.data.length > 0) data = fallback.data;
        else {
          const all = await supabase.from('completed_sessions').select('*').order('id', { ascending: true });
          if (all.data && all.data.length > 0) data = all.data;
        }
      }

      if (error || !data) return [];
      return data.map((s) => ({
        id: s.id,
        deviceName: s.device_name,
        deviceType: s.device_type,
        isVIP: Boolean(s.is_vip),
        customerName: s.customer_name || '',
        startTime: Number(s.start_time),
        endTime: Number(s.end_time),
        durationSeconds: s.duration_seconds,
        mode: s.mode,
        timeType: s.time_type,
        targetMinutes: s.target_minutes,
        timeCost: parseFloat(s.time_cost) || 0,
        ordersCost: parseFloat(s.orders_cost) || 0,
        total: parseFloat(s.total) || 0,
        clientPhone: s.client_phone,
      }));
    } catch (err) {
      console.error('Supabase fetchCompletedSessions exception:', err);
      return [];
    }
  },

  async addCompletedSession(session, clientPhone = 'default') {
    if (!isSupabaseConfigured) return null;
    try {
      const payload = {
        device_name: session.deviceName,
        device_type: session.deviceType,
        is_vip: session.isVIP,
        customer_name: session.customerName || '',
        start_time: session.startTime,
        end_time: session.endTime,
        duration_seconds: session.durationSeconds,
        mode: session.mode,
        time_type: session.timeType || 'open',
        target_minutes: session.targetMinutes || null,
        time_cost: session.timeCost,
        orders_cost: session.ordersCost,
        total: session.total,
      };

      let res = await supabase
        .from('completed_sessions')
        .insert({ ...payload, client_phone: clientPhone })
        .select()
        .single();

      if (res.error && res.error.code === '42703') {
        res = await supabase
          .from('completed_sessions')
          .insert(payload)
          .select()
          .single();
      }

      return res.data;
    } catch (err) {
      console.error('Supabase addCompletedSession exception:', err);
      return null;
    }
  },

  async clearCompletedSessions(clientPhone = 'default') {
    if (!isSupabaseConfigured) return;
    try {
      let res = await supabase
        .from('completed_sessions')
        .delete()
        .eq('client_phone', clientPhone);

      if (res.error && res.error.code === '42703') {
        await supabase.from('completed_sessions').delete().neq('id', 0);
      }
    } catch (err) {
      console.error('Supabase clearCompletedSessions exception:', err);
    }
  },

  // ── Realtime Listener ──
  subscribeToChanges(onChange) {
    if (!isSupabaseConfigured || !supabase) return () => {};
    try {
      const channel = supabase
        .channel('cafe-realtime-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'devices' },
          (p) => onChange?.('devices', p)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'categories' },
          (p) => onChange?.('categories', p)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (p) => onChange?.('products', p)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'completed_sessions' },
          (p) => onChange?.('completed_sessions', p)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error('Supabase realtime error:', err);
      return () => {};
    }
  },
};
