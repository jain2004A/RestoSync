import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import type { MobileTable } from '../types';
import { mobileSignalR } from '../services/socket';
import { mobileApiClient } from '../services/apiClient';
import { PairedOutlet } from '../services/pairingService';
import { showAlert } from '../utils/alert';

interface FloorPlanScreenProps {
  staffName: string;
  pairedOutlet: PairedOutlet;
  authData: { token: string; tenantId: string; outletId: string };
  onSelectTable: (table: MobileTable) => void;
  onLogout: () => void;
}

export const FloorPlanScreen: React.FC<FloorPlanScreenProps> = ({
  staffName,
  pairedOutlet,
  authData,
  onSelectTable,
  onLogout,
}) => {
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [tables, setTables] = useState<MobileTable[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showReadyModal, setShowReadyModal] = useState<boolean>(false);

  const fetchTables = useCallback(async () => {
    try {
      setError(null);
      const [tablesRes, ordersRes] = await Promise.allSettled([
        mobileApiClient.get('/tables'),
        mobileApiClient.get('/orders?limit=50'),
      ]);

      if (tablesRes.status === 'fulfilled' && tablesRes.value.data?.success && Array.isArray(tablesRes.value.data.data)) {
        const activeOrders =
          ordersRes.status === 'fulfilled' && ordersRes.value.data?.success && Array.isArray(ordersRes.value.data.data)
            ? ordersRes.value.data.data
            : [];

        const apiTables: MobileTable[] = tablesRes.value.data.data.map((item: any) => {
          const tableOrder = activeOrders.find(
            (o: any) =>
              o.tableNumber &&
              o.tableNumber.toUpperCase() === item.tableNumber?.toUpperCase() &&
              o.status !== 5 &&
              o.status !== 6 &&
              o.status !== 'Delivered' &&
              o.status !== 'Cancelled'
          );

          let status: MobileTable['status'] = item.isOccupied ? 'Occupied' : 'Vacant';
          if (tableOrder) {
            if (tableOrder.status === 3 || tableOrder.status === 'FoodReady') {
              status = 'FoodReady';
            } else if (tableOrder.status === 7 || tableOrder.status === 'Served') {
              status = 'Served';
            } else {
              status = 'Occupied';
            }
          }

          return {
            id: item.id,
            tableNumber: item.tableNumber,
            section: item.section || 'Main Hall',
            capacity: item.seatingCapacity || 4,
            isOccupied: Boolean(item.isOccupied) || Boolean(tableOrder),
            status,
            activeOrderId: tableOrder?.id,
            kotNumber: tableOrder?.kotNumber,
            items: tableOrder?.items || [],
            orderTotal: tableOrder?.totalAmount ?? item.orderTotal,
            runningMinutes: item.runningMinutes,
            servedAt: tableOrder?.servedAt,
          };
        });
        setTables(apiTables);
      } else {
        setError('Failed to retrieve tables from server.');
        setTables([]);
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        err.message ||
        'Error connecting to server. Please check your network or try again.';
      setError(serverMsg);
      setTables([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // 1. Start SignalR with real tenantId, outletId, and JWT token
    mobileSignalR.startConnection(authData.tenantId, authData.outletId, authData.token);

    // 2. Real-time table occupancy listener
    const handleStatusChange = (data: any) => {
      if (!data || !data.tableNumber) return;
      const isOccupied = Boolean(data.isOccupied);

      setTables((prev) =>
        prev.map((t) => {
          if (t.tableNumber.toUpperCase() === data.tableNumber.toUpperCase()) {
            return {
              ...t,
              isOccupied,
              status: isOccupied ? t.status : 'Vacant',
              orderTotal: isOccupied ? (data.orderTotal ?? t.orderTotal) : undefined,
              runningMinutes: isOccupied ? (t.runningMinutes || 1) : undefined,
            };
          }
          return t;
        })
      );
    };

    // 3. Real-time table structure changes (created/deleted/bulk)
    const handleListChange = () => {
      fetchTables();
    };

    // 4. Real-time Order Updates (Kitchen Bump to FoodReady, or Served)
    const handleOrderUpdate = (order: any) => {
      if (!order || !order.tableNumber) return;
      const targetTableNum = String(order.tableNumber).trim().toUpperCase();

      setTables((prev) =>
        prev.map((t) => {
          if (t.tableNumber.toUpperCase() === targetTableNum) {
            const isReady = order.status === 3 || order.status === 'FoodReady';
            const isServed = order.status === 7 || order.status === 'Served';
            const isCleared =
              order.status === 5 ||
              order.status === 'Delivered' ||
              order.status === 6 ||
              order.status === 'Cancelled';

            let newStatus: MobileTable['status'] = t.status;
            if (isCleared) newStatus = 'Vacant';
            else if (isReady) newStatus = 'FoodReady';
            else if (isServed) newStatus = 'Served';
            else if (t.isOccupied) newStatus = 'Occupied';

            return {
              ...t,
              isOccupied: !isCleared,
              status: newStatus,
              activeOrderId: order.id || t.activeOrderId,
              kotNumber: order.kotNumber || t.kotNumber,
              orderTotal: order.totalAmount ?? t.orderTotal,
              items: order.items ?? t.items,
              servedAt: isServed ? (order.servedAt || 'Just Now') : (isReady ? undefined : t.servedAt),
            };
          }
          return t;
        })
      );
    };

    mobileSignalR.on('TableStatusChanged', handleStatusChange);
    mobileSignalR.on('TableListChanged', handleListChange);
    mobileSignalR.on('ReceiveOrderUpdate', handleOrderUpdate);
    mobileSignalR.on('OrderStatusChanged', handleOrderUpdate);

    // 5. Initial live tables fetch
    fetchTables();

    return () => {
      mobileSignalR.off('TableStatusChanged', handleStatusChange);
      mobileSignalR.off('TableListChanged', handleListChange);
      mobileSignalR.off('ReceiveOrderUpdate', handleOrderUpdate);
      mobileSignalR.off('OrderStatusChanged', handleOrderUpdate);
    };
  }, [authData.tenantId, authData.outletId, authData.token, fetchTables]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTables();
  };

  const handleLogoutPress = () => {
    mobileSignalR.stopConnection();
    onLogout();
  };

  const handleMarkServed = async (table: MobileTable) => {
    try {
      const targetId = table.activeOrderId || table.kotNumber || table.tableNumber;
      await mobileApiClient.patch(`/orders/${encodeURIComponent(targetId)}/status`, { status: 7 });

      setTables((prev) =>
        prev.map((t) =>
          t.id === table.id
            ? { ...t, status: 'Served', servedAt: 'Just Now' }
            : t
        )
      );
      showAlert('Food Served', `Table ${table.tableNumber} marked as Served!`);
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Failed to mark as served.');
    }
  };

  // Ready tables
  const readyTables = useMemo(() => tables.filter((t) => t.status === 'FoodReady'), [tables]);

  // Derive sections dynamically from live table records
  const uniqueSections = Array.from(new Set(tables.map((t) => t.section).filter(Boolean)));
  const sections = ['All', ...uniqueSections];

  const filteredTables = tables.filter(
    (t) => selectedSection === 'All' || t.section === selectedSection
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Staff Bar */}
      <View style={styles.topBar}>
        <View style={styles.staffInfoCol}>
          <Text style={styles.staffTitle}>{staffName}</Text>
          <Text style={styles.branchSub} numberOfLines={1}>
            {pairedOutlet.outletName} • Floor Terminal
          </Text>
        </View>

        <TouchableOpacity onPress={handleLogoutPress} style={styles.logoutBtn} activeOpacity={0.7}>
          <Text style={styles.logoutText}>🔒 Lock PIN</Text>
        </TouchableOpacity>
      </View>

      {/* Food Ready Alert Bar for Waiter */}
      {readyTables.length > 0 && (
        <TouchableOpacity
          style={styles.foodReadyBanner}
          onPress={() => setShowReadyModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.foodReadyIcon}>🔥</Text>
          <View style={styles.foodReadyTextCol}>
            <Text style={styles.foodReadyTitle}>
              {readyTables.length} Order{readyTables.length > 1 ? 's' : ''} Ready in Kitchen!
            </Text>
            <Text style={styles.foodReadySub} numberOfLines={1}>
              {readyTables.map((t) => t.tableNumber).join(', ')} • Tap to view & serve
            </Text>
          </View>
          <View style={styles.foodReadyActionBadge}>
            <Text style={styles.foodReadyActionText}>Serve →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Section Filter Pills */}
      {sections.length > 1 && (
        <View style={styles.sectionScroll}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContainer}
          >
            {sections.map((sec) => (
              <TouchableOpacity
                key={sec}
                onPress={() => setSelectedSection(sec)}
                style={[
                  styles.pill,
                  selectedSection === sec ? styles.pillActive : styles.pillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    selectedSection === sec ? styles.pillTextActive : styles.pillTextInactive,
                  ]}
                >
                  {sec}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Content: Loading, Error, or Tables Grid */}
      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingMessage}>Loading tables from {pairedOutlet.outletName}...</Text>
          <Text style={styles.loadingSub}>Connecting to live backend</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredState}>
          <View style={styles.errorCard}>
            <Text style={styles.errorBigIcon}>⚠️</Text>
            <Text style={styles.errorHeading}>Unable to Load Tables</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchTables} activeOpacity={0.8}>
              <Text style={styles.retryBtnText}>↻ Retry Connecting</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : tables.length === 0 ? (
        <View style={styles.centeredState}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyTitle}>No Tables Found</Text>
          <Text style={styles.emptySub}>
            No dining tables have been created for {pairedOutlet.outletName} yet.
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchTables} activeOpacity={0.8}>
            <Text style={styles.refreshBtnText}>↻ Refresh Live Data</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.gridContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#2563eb']} />
          }
        >
          {filteredTables.map((t) => {
            let statusBadge = '🟢 Vacant';
            let borderColor = '#10b981';
            let bgColor = '#ffffff';

            if (t.status === 'FoodReady') {
              statusBadge = '🔥 Food Ready';
              borderColor = '#f43f5e';
              bgColor = '#fff1f2';
            } else if (t.status === 'Served') {
              statusBadge = '✅ Served';
              borderColor = '#10b981';
              bgColor = '#f0fdf4';
            } else if (t.status === 'Occupied') {
              statusBadge = '⏳ Active KOT';
              borderColor = '#f59e0b';
              bgColor = '#fffbeb';
            }

            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tableCard, { borderColor, backgroundColor: bgColor }]}
                onPress={() => onSelectTable(t)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.tableNum}>{t.tableNumber}</Text>
                  <Text style={styles.seats}>{t.capacity} Seats</Text>
                </View>

                <Text style={styles.sectionName}>{t.section}</Text>

                {t.isOccupied ? (
                  <View style={styles.occupiedInfo}>
                    {t.orderTotal !== undefined && (
                      <Text style={styles.runningTotal}>₹{t.orderTotal}</Text>
                    )}
                    {t.runningMinutes !== undefined && (
                      <Text style={styles.runningTime}>{t.runningMinutes}m ago</Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.vacantInfo}>
                    <Text style={styles.vacantText}>Tap to Punch</Text>
                  </View>
                )}

                <View style={[styles.badge, { borderColor }]}>
                  <Text style={styles.badgeText}>{statusBadge}</Text>
                </View>

                {t.status === 'FoodReady' && (
                  <TouchableOpacity
                    style={styles.cardServeBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handleMarkServed(t);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cardServeBtnText}>🍽️ Mark Served</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Ready Orders Modal */}
      <Modal
        visible={showReadyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReadyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Text style={styles.modalHeaderIcon}>🔥</Text>
                <View>
                  <Text style={styles.modalTitle}>Kitchen Ready Orders</Text>
                  <Text style={styles.modalSubtitle}>
                    {readyTables.length} table{readyTables.length > 1 ? 's' : ''} waiting to be served
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowReadyModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {readyTables.map((rt) => (
                <View key={rt.id} style={styles.readyOrderCard}>
                  <View style={styles.readyCardTop}>
                    <View>
                      <Text style={styles.readyTableNum}>{rt.tableNumber}</Text>
                      <Text style={styles.readyTableSec}>
                        {rt.section} • {rt.kotNumber || 'Running KOT'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.readyServeBtn}
                      onPress={async () => {
                        await handleMarkServed(rt);
                        if (readyTables.length <= 1) setShowReadyModal(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.readyServeBtnText}>🍽️ Mark Served</Text>
                    </TouchableOpacity>
                  </View>

                  {rt.items && rt.items.length > 0 && (
                    <View style={styles.readyItemsBox}>
                      {rt.items.map((it: any, i: number) => (
                        <View key={i} style={styles.readyItemRow}>
                          <Text style={styles.readyItemName}>
                            {it.name || it.itemName}
                          </Text>
                          <Text style={styles.readyItemQty}>
                            × {it.quantity || it.qty || 1}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalFooterBtn}
              onPress={() => setShowReadyModal(false)}
            >
              <Text style={styles.modalFooterBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  staffInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  staffTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  branchSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  logoutBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logoutText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  foodReadyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderBottomWidth: 1.5,
    borderBottomColor: '#fecdd3',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  foodReadyIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  foodReadyTextCol: {
    flex: 1,
  },
  foodReadyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e11d48',
  },
  foodReadySub: {
    fontSize: 11,
    color: '#9f1239',
    marginTop: 1,
  },
  foodReadyActionBadge: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  foodReadyActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionScroll: {
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pillsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pillInactive: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  pillTextInactive: {
    color: '#64748b',
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingMessage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 14,
    textAlign: 'center',
  },
  loadingSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 20,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  errorBigIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 280,
  },
  refreshBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  refreshBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  gridContainer: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  tableCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 130,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  seats: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  sectionName: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  occupiedInfo: {
    marginVertical: 8,
  },
  runningTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#d97706',
  },
  runningTime: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  vacantInfo: {
    marginVertical: 10,
  },
  vacantText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1e293b',
  },
  cardServeBtn: {
    marginTop: 8,
    backgroundColor: '#059669',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardServeBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff1f2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalHeaderIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#e11d48',
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  modalScroll: {
    padding: 16,
  },
  readyOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#fecdd3',
    padding: 14,
    marginBottom: 12,
  },
  readyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  readyTableNum: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  readyTableSec: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  readyServeBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  readyServeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  readyItemsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  readyItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  readyItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  readyItemQty: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalFooterBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalFooterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
});
