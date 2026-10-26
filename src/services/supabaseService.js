import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const supabaseService = {
  // ── Devices ──
  async fetchDevices() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('id', { ascending: true });

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
      }));
    } catch (err) {
      console.error('Supabase fetchDevices exception:', err);
      return [];
    }
  },

  async upsertDevice(device) {
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

      // 1. إذا كان للجهاز id معروف في قاعدة البيانات، نحدثه مباشرة بالـ id لضمان 100% عدم حدوث تضارب
      if (device.id && typeof device.id === 'number') {
        const { data, error } = await supabase
          .from('devices')
          .update(payload)
          .eq('id', device.id)
          .select()
          .single();

        if (!error && data) return data;
      }

      // 2. إذا كان جهازاً جديداً أو بدون id، نحدث بناءً على الاسم الفريد
      const { data, error } = await supabase
        .from('devices')
        .upsert(payload, { onConflict: 'name' })
        .select()
        .single();

      if (error) console.error('Error upserting device:', error);
      return data;
    } catch (err) {
      console.error('Supabase upsertDevice exception:', err);
      return null;
    }
  },

  async deleteDevice(deviceName, deviceId) {
    if (!isSupabaseConfigured) return;
    try {
      if (deviceId) {
        await supabase.from('devices').delete().eq('id', deviceId);
      } else {
        await supabase.from('devices').delete().eq('name', deviceName);
      }
    } catch (err) {
      console.error('Supabase deleteDevice exception:', err);
    }
  },

  // ── Categories ──
  async fetchCategories() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .order('id', { ascending: true });

      if (error || !data) return [];
      return data.map((c) => c.name);
    } catch (err) {
      console.error('Supabase fetchCategories exception:', err);
      return [];
    }
  },

  async addCategory(name) {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('categories').insert({ name });
    } catch (err) {
      console.error('Supabase addCategory exception:', err);
    }
  },

  async deleteCategory(name) {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('categories').delete().eq('name', name);
    } catch (err) {
      console.error('Supabase deleteCategory exception:', err);
    }
  },

  // ── Products (Buffet) ──
  async fetchProducts() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (error || !data) return [];
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        price: parseFloat(p.price) || 0,
        category: p.category || 'مشروبات',
      }));
    } catch (err) {
      console.error('Supabase fetchProducts exception:', err);
      return [];
    }
  },

  async addProduct(product) {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: product.name,
          price: product.price,
          category: product.category,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding product:', error);
        return null;
      }
      return data;
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
  async fetchCompletedSessions() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('completed_sessions')
        .select('*')
        .order('id', { ascending: true });

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
      }));
    } catch (err) {
      console.error('Supabase fetchCompletedSessions exception:', err);
      return [];
    }
  },

  async addCompletedSession(session) {
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

      const { data, error } = await supabase
        .from('completed_sessions')
        .insert(payload)
        .select()
        .single();

      if (error) console.error('Error adding completed session to Supabase:', error);
      return data;
    } catch (err) {
      console.error('Supabase addCompletedSession exception:', err);
      return null;
    }
  },

  async clearCompletedSessions() {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('completed_sessions').delete().neq('id', 0);
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
