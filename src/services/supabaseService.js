import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const supabaseService = {
  // ── Devices (معزولة لكل مشترك بـ الكود / الهاتف) ──
  async fetchDevices(identifier, phone = null) {
    if (!isSupabaseConfigured || !identifier) return [];
    try {
      const clientPhone = phone || identifier;
      const orFilter = identifier === clientPhone
        ? `client_code.eq.${identifier},client_phone.eq.${identifier}`
        : `client_code.eq.${identifier},client_phone.eq.${clientPhone},client_code.eq.${clientPhone},client_phone.eq.${identifier}`;

      let { data, error } = await supabase
        .from('devices')
        .select('*')
        .or(orFilter)
        .order('id', { ascending: true });

      if (error && error.code === '42703') {
        const res = await supabase
          .from('devices')
          .select('*')
          .eq('client_phone', clientPhone)
          .order('id', { ascending: true });
        data = res.data;
        error = res.error;
      }

      if (error) {
        console.error('Error fetching client devices:', error);
        return [];
      }

      return (data || []).map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        isVIP: Boolean(d.is_vip),
        singlePrice: parseFloat(d.single_price) || 0,
        multiPrice: parseFloat(d.multi_price) || 0,
        status: d.status || 'free',
        session: d.session || null,
        clientCode: d.client_code || identifier,
      }));
    } catch (err) {
      console.error('fetchDevices exception:', err);
      return [];
    }
  },

  async insertDevice(device, identifier, phone = null) {
    if (!isSupabaseConfigured || !identifier) return null;
    try {
      const payload = {
        client_code: identifier,
        client_phone: phone || identifier,
        name: device.name.trim(),
        type: device.type,
        is_vip: device.isVIP,
        single_price: device.singlePrice,
        multi_price: device.multiPrice,
        status: device.status || 'free',
        session: device.session || null,
      };

      let res = await supabase
        .from('devices')
        .insert(payload)
        .select()
        .single();

      if (res.error && res.error.code === '42703') {
        delete payload.client_code;
        res = await supabase.from('devices').insert(payload).select().single();
      }

      if (res.error) {
        console.error('Error inserting device:', res.error);
        return null;
      }
      return res.data;
    } catch (err) {
      console.error('insertDevice exception:', err);
      return null;
    }
  },

  async updateDevice(id, updates) {
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

      const { data, error } = await supabase
        .from('devices')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

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

  async deleteDevice(id) {
    if (!isSupabaseConfigured || !id) return;
    try {
      const { error } = await supabase.from('devices').delete().eq('id', id);
      if (error) console.error('Error deleting device:', error);
    } catch (err) {
      console.error('deleteDevice exception:', err);
    }
  },

  // ── Categories ──
  async fetchCategories(identifier, phone = null) {
    if (!isSupabaseConfigured || !identifier) return [];
    try {
      const clientPhone = phone || identifier;
      const orFilter = identifier === clientPhone
        ? `client_code.eq.${identifier},client_phone.eq.${identifier}`
        : `client_code.eq.${identifier},client_phone.eq.${clientPhone},client_code.eq.${clientPhone},client_phone.eq.${identifier}`;

      let { data, error } = await supabase
        .from('categories')
        .select('name')
        .or(orFilter)
        .order('id', { ascending: true });

      if (error && error.code === '42703') {
        const res = await supabase
          .from('categories')
          .select('name')
          .eq('client_phone', clientPhone)
          .order('id', { ascending: true });
        data = res.data;
        error = res.error;
      }

      if (error || !data) return [];
      return data.map((c) => c.name);
    } catch (err) {
      return [];
    }
  },

  async addCategory(name, identifier, phone = null) {
    if (!isSupabaseConfigured || !identifier) return;
    try {
      let res = await supabase
        .from('categories')
        .insert({ name: name.trim(), client_code: identifier, client_phone: phone || identifier });

      if (res.error && res.error.code === '42703') {
        await supabase
          .from('categories')
          .insert({ name: name.trim(), client_phone: phone || identifier });
      }
    } catch (err) {
      console.error('addCategory exception:', err);
    }
  },

  async deleteCategory(name, identifier) {
    if (!isSupabaseConfigured || !identifier) return;
    try {
      await supabase
        .from('categories')
        .delete()
        .eq('name', name);
    } catch (err) {
      console.error('deleteCategory exception:', err);
    }
  },

  // ── Products (البوفيه والمشروبات معزولة لكل مشترك) ──
  async fetchProducts(identifier, phone = null) {
    if (!isSupabaseConfigured || !identifier) return [];
    try {
      const clientPhone = phone || identifier;
      const orFilter = identifier === clientPhone
        ? `client_code.eq.${identifier},client_phone.eq.${identifier}`
        : `client_code.eq.${identifier},client_phone.eq.${clientPhone},client_code.eq.${clientPhone},client_phone.eq.${identifier}`;

      let { data, error } = await supabase
        .from('products')
        .select('*')
        .or(orFilter)
        .order('id', { ascending: true });

      if (error && error.code === '42703') {
        const res = await supabase
          .from('products')
          .select('*')
          .eq('client_phone', clientPhone)
          .order('id', { ascending: true });
        data = res.data;
        error = res.error;
      }

      if (error || !data) return [];
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        price: parseFloat(p.price) || 0,
        category: p.category || 'مشروبات',
        clientCode: p.client_code || identifier,
      }));
    } catch (err) {
      return [];
    }
  },

  async insertProduct(product, identifier, phone = null) {
    if (!isSupabaseConfigured || !identifier) return null;
    try {
      const payload = {
        client_code: identifier,
        client_phone: phone || identifier,
        name: product.name.trim(),
        price: product.price,
        category: product.category || 'مشروبات',
      };

      let res = await supabase
        .from('products')
        .insert(payload)
        .select()
        .single();

      if (res.error && res.error.code === '42703') {
        delete payload.client_code;
        res = await supabase.from('products').insert(payload).select().single();
      }

      if (res.error) {
        console.error('Error inserting product:', res.error);
        return null;
      }
      return res.data;
    } catch (err) {
      console.error('insertProduct exception:', err);
      return null;
    }
  },

  async updateProduct(id, updates) {
    if (!isSupabaseConfigured || !id) return;
    try {
      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.price !== undefined) payload.price = updates.price;
      if (updates.category !== undefined) payload.category = updates.category;

      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) console.error('Error updating product:', error);
    } catch (err) {
      console.error('updateProduct exception:', err);
    }
  },

  async deleteProduct(id) {
    if (!isSupabaseConfigured || !id) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) console.error('Error deleting product:', error);
    } catch (err) {
      console.error('deleteProduct exception:', err);
    }
  },

  // ── Completed Sessions / Invoices ──
  async fetchCompletedSessions(identifier, phone = null) {
    if (!isSupabaseConfigured || !identifier) return [];
    try {
      const clientPhone = phone || identifier;
      const orFilter = identifier === clientPhone
        ? `client_code.eq.${identifier},client_phone.eq.${identifier}`
        : `client_code.eq.${identifier},client_phone.eq.${clientPhone},client_code.eq.${clientPhone},client_phone.eq.${identifier}`;

      let { data, error } = await supabase
        .from('completed_sessions')
        .select('*')
        .or(orFilter)
        .order('id', { ascending: true });

      if (error && error.code === '42703') {
        const res = await supabase
          .from('completed_sessions')
          .select('*')
          .eq('client_phone', clientPhone)
          .order('id', { ascending: true });
        data = res.data;
        error = res.error;
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
        clientCode: s.client_code || identifier,
      }));
    } catch (err) {
      return [];
    }
  },

  async addCompletedSession(session, identifier, phone = null) {
    if (!isSupabaseConfigured || !identifier) return null;
    try {
      const payload = {
        client_code: identifier,
        client_phone: phone || identifier,
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
        .insert(payload)
        .select()
        .single();

      if (res.error && res.error.code === '42703') {
        delete payload.client_code;
        res = await supabase.from('completed_sessions').insert(payload).select().single();
      }

      if (res.error) console.error('Error adding completed session to Supabase:', res.error);
      return res.data;
    } catch (err) {
      console.error('addCompletedSession exception:', err);
      return null;
    }
  },

  async clearCompletedSessions(identifier) {
    if (!isSupabaseConfigured || !identifier) return;
    try {
      await supabase
        .from('completed_sessions')
        .delete()
        .or(`client_code.eq.${identifier},client_phone.eq.${identifier}`);
    } catch (err) {
      console.error('clearCompletedSessions exception:', err);
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
