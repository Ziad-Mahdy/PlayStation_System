import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const supabaseService = {
  // ── Devices (معزولة بالكامل بـ client_code لكل مشترك) ──
  async fetchDevices(clientCode) {
    if (!isSupabaseConfigured || !clientCode) return [];
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('client_code', clientCode)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching devices from Supabase:', error);
        return [];
      }

      // توحيد الأجهزة بالاسم لتفادي أي تكرار
      const seenNames = new Set();
      const uniqueDevices = [];
      for (const d of (data || [])) {
        const normName = (d.name || '').trim().toLowerCase();
        if (normName && !seenNames.has(normName)) {
          seenNames.add(normName);
          uniqueDevices.push({
            id: d.id,
            name: d.name,
            type: d.type,
            isVIP: Boolean(d.is_vip),
            singlePrice: parseFloat(d.single_price) || 0,
            multiPrice: parseFloat(d.multi_price) || 0,
            status: d.status || 'free',
            session: d.session || null,
            clientCode: d.client_code,
          });
        }
      }
      return uniqueDevices;
    } catch (err) {
      console.error('fetchDevices exception:', err);
      return [];
    }
  },

  async insertDevice(device, clientCode, clientPhone = '') {
    if (!isSupabaseConfigured || !clientCode) return null;
    try {
      const trimmedName = (device.name || '').trim();

      // فحص مسبق: إذا كان الجهاز موجوداً بالفعل لنفس الكود نرجعه فوراً
      const { data: existing } = await supabase
        .from('devices')
        .select('*')
        .eq('client_code', clientCode)
        .eq('name', trimmedName)
        .limit(1);

      if (existing && existing.length > 0) {
        const d = existing[0];
        return {
          id: d.id,
          name: d.name,
          type: d.type,
          isVIP: Boolean(d.is_vip),
          singlePrice: parseFloat(d.single_price) || 0,
          multiPrice: parseFloat(d.multi_price) || 0,
          status: d.status || 'free',
          session: d.session || null,
          clientCode: d.client_code,
        };
      }

      const payload = {
        client_code: clientCode,
        client_phone: clientPhone || clientCode,
        name: trimmedName,
        type: device.type,
        is_vip: Boolean(device.isVIP),
        single_price: parseFloat(device.singlePrice) || 0,
        multi_price: parseFloat(device.multiPrice) || 0,
        status: device.status || 'free',
        session: device.session || null,
      };

      const { data, error } = await supabase
        .from('devices')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Error inserting device:', error);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        type: data.type,
        isVIP: Boolean(data.is_vip),
        singlePrice: parseFloat(data.single_price) || 0,
        multiPrice: parseFloat(data.multi_price) || 0,
        status: data.status || 'free',
        session: data.session || null,
        clientCode: data.client_code,
      };
    } catch (err) {
      console.error('insertDevice exception:', err);
      return null;
    }
  },

  async updateDevice(id, updates, clientCode = null) {
    if (!isSupabaseConfigured || !id) return null;
    try {
      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.isVIP !== undefined) payload.is_vip = updates.isVIP;
      if (updates.singlePrice !== undefined) payload.single_price = updates.singlePrice;
      if (updates.multiPrice !== undefined) payload.multi_price = updates.multiPrice;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.session !== undefined) payload.session = updates.session;

      let query = supabase.from('devices').update(payload).eq('id', id);
      if (clientCode) {
        query = query.eq('client_code', clientCode);
      }

      const { data, error } = await query.select().single();
      if (error) {
        console.error('Error updating device:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('updateDevice exception:', err);
      return null;
    }
  },

  async deleteDevice(id, clientCode = null) {
    if (!isSupabaseConfigured || !id) return false;
    try {
      let query = supabase.from('devices').delete().eq('id', id);
      if (clientCode) {
        query = query.eq('client_code', clientCode);
      }
      const { error } = await query;
      if (error) {
        console.error('Error deleting device:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('deleteDevice exception:', err);
      return false;
    }
  },

  // ── Categories (معزولة لكل كود اشتراك) ──
  async fetchCategories(clientCode) {
    if (!isSupabaseConfigured || !clientCode) return [];
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('client_code', clientCode)
        .order('id', { ascending: true });

      if (error || !data) return [];
      return data.map((c) => c.name);
    } catch (err) {
      return [];
    }
  },

  async addCategory(name, clientCode, clientPhone = '') {
    if (!isSupabaseConfigured || !clientCode || !name?.trim()) return;
    try {
      const trimmed = name.trim();
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('client_code', clientCode)
        .eq('name', trimmed)
        .limit(1);

      if (existing && existing.length > 0) return;

      await supabase.from('categories').insert({
        name: trimmed,
        client_code: clientCode,
        client_phone: clientPhone || clientCode,
      });
    } catch (err) {
      console.error('addCategory exception:', err);
    }
  },

  async deleteCategory(name, clientCode) {
    if (!isSupabaseConfigured || !clientCode || !name) return;
    try {
      await supabase
        .from('categories')
        .delete()
        .eq('client_code', clientCode)
        .eq('name', name.trim());
    } catch (err) {
      console.error('deleteCategory exception:', err);
    }
  },

  // ── Products (معزولة لكل كود اشتراك) ──
  async fetchProducts(clientCode) {
    if (!isSupabaseConfigured || !clientCode) return [];
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('client_code', clientCode)
        .order('id', { ascending: true });

      if (error || !data) {
        console.error('Error fetching products from Supabase:', error);
        return [];
      }

      // توحيد المنتجات بالاسم لمنع تكرار أي منتج
      const seenNames = new Set();
      const uniqueProducts = [];
      for (const p of data) {
        const normName = (p.name || '').trim().toLowerCase();
        if (normName && !seenNames.has(normName)) {
          seenNames.add(normName);
          uniqueProducts.push({
            id: p.id,
            name: p.name,
            price: parseFloat(p.price) || 0,
            category: p.category || 'مشروبات',
            clientCode: p.client_code,
          });
        }
      }
      return uniqueProducts;
    } catch (err) {
      console.error('fetchProducts exception:', err);
      return [];
    }
  },

  async insertProduct(product, clientCode, clientPhone = '') {
    if (!isSupabaseConfigured || !clientCode) return null;
    try {
      const trimmedName = (product.name || '').trim();

      // فحص مسبق: إذا كان المنتج مسجلاً لهذا الكود
      const { data: existing } = await supabase
        .from('products')
        .select('*')
        .eq('client_code', clientCode)
        .eq('name', trimmedName)
        .limit(1);

      if (existing && existing.length > 0) {
        const p = existing[0];
        return {
          id: p.id,
          name: p.name,
          price: parseFloat(p.price) || 0,
          category: p.category || 'مشروبات',
          clientCode: p.client_code,
        };
      }

      const payload = {
        client_code: clientCode,
        client_phone: clientPhone || clientCode,
        name: trimmedName,
        price: parseFloat(product.price) || 0,
        category: product.category || 'مشروبات',
      };

      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Error inserting product:', error);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        price: parseFloat(data.price) || 0,
        category: data.category || 'مشروبات',
        clientCode: data.client_code,
      };
    } catch (err) {
      console.error('insertProduct exception:', err);
      return null;
    }
  },

  async updateProduct(id, updates, clientCode = null) {
    if (!isSupabaseConfigured || !id) return null;
    try {
      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.price !== undefined) payload.price = parseFloat(updates.price) || 0;
      if (updates.category !== undefined) payload.category = updates.category;

      let query = supabase.from('products').update(payload).eq('id', id);
      if (clientCode) query = query.eq('client_code', clientCode);

      const { data, error } = await query.select().single();
      if (error) console.error('Error updating product:', error);
      return data;
    } catch (err) {
      console.error('updateProduct exception:', err);
      return null;
    }
  },

  async deleteProduct(id, name = null, clientCode = null) {
    if (!isSupabaseConfigured || (!id && !name)) return false;
    try {
      // 1. حذف مباشر بمعرف السجل id (إذا كان موجوداً كرقم حقيقي)
      if (id && typeof id === 'number') {
        let q = supabase.from('products').delete().eq('id', id);
        if (clientCode) q = q.eq('client_code', clientCode);
        const { error } = await q;
        if (!error) return true;
      }

      // 2. كإجراء أمان: حذف بالاسم وكود العميل
      if (name && clientCode) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('client_code', clientCode)
          .eq('name', name.trim());
        if (!error) return true;
      }

      return true;
    } catch (err) {
      console.error('deleteProduct exception:', err);
      return false;
    }
  },

  // ── Completed Sessions / Invoices (معزولة لكل كود اشتراك) ──
  async fetchCompletedSessions(clientCode) {
    if (!isSupabaseConfigured || !clientCode) return [];
    try {
      const { data, error } = await supabase
        .from('completed_sessions')
        .select('*')
        .eq('client_code', clientCode)
        .order('id', { ascending: false });

      if (error || !data) {
        console.error('Error fetching completed sessions:', error);
        return [];
      }

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
        clientCode: s.client_code,
      }));
    } catch (err) {
      console.error('fetchCompletedSessions exception:', err);
      return [];
    }
  },

  async addCompletedSession(session, clientCode, clientPhone = '') {
    if (!isSupabaseConfigured || !clientCode) return null;
    try {
      const payload = {
        client_code: clientCode,
        client_phone: clientPhone || clientCode,
        device_name: session.deviceName,
        device_type: session.deviceType,
        is_vip: Boolean(session.isVIP),
        customer_name: session.customerName || '',
        start_time: Number(session.startTime),
        end_time: Number(session.endTime),
        duration_seconds: session.durationSeconds,
        mode: session.mode,
        time_type: session.timeType || 'open',
        target_minutes: session.targetMinutes || null,
        time_cost: parseFloat(session.timeCost) || 0,
        orders_cost: parseFloat(session.ordersCost) || 0,
        total: parseFloat(session.total) || 0,
      };

      const { data, error } = await supabase
        .from('completed_sessions')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Error inserting completed session in Supabase:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('addCompletedSession exception:', err);
      return null;
    }
  },

  async deleteCompletedSession(id, clientCode = null) {
    if (!isSupabaseConfigured || !id) return false;
    try {
      let query = supabase.from('completed_sessions').delete().eq('id', id);
      if (clientCode) {
        query = query.eq('client_code', clientCode);
      }
      const { error } = await query;
      if (error) {
        console.error('Error deleting completed session from Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('deleteCompletedSession exception:', err);
      return false;
    }
  },

  async clearCompletedSessions(clientCode, onlyToday = true) {
    if (!isSupabaseConfigured || !clientCode) return false;
    try {
      let query = supabase
        .from('completed_sessions')
        .delete()
        .eq('client_code', clientCode);

      if (onlyToday) {
        const now = new Date();
        const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        query = query.gte('end_time', startOfTodayMs);
      }

      const { error } = await query;
      if (error) console.error('Error clearing completed sessions:', error);
      return !error;
    } catch (err) {
      console.error('clearCompletedSessions exception:', err);
      return false;
    }
  },

  // ── Realtime Listener (مع حصر القناة للعميل) ──
  subscribeToChanges(clientCode, onChange) {
    if (!isSupabaseConfigured || !supabase || !clientCode) return () => {};
    try {
      const channel = supabase
        .channel(`cafe-realtime-${clientCode}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'devices', filter: `client_code=eq.${clientCode}` },
          (p) => onChange?.('devices', p)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'categories', filter: `client_code=eq.${clientCode}` },
          (p) => onChange?.('categories', p)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products', filter: `client_code=eq.${clientCode}` },
          (p) => onChange?.('products', p)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'completed_sessions', filter: `client_code=eq.${clientCode}` },
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
