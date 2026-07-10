import React, {useEffect, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Button,
  Spin,
  Empty,
  Pagination,
  Tag,
  Typography,
  Drawer,
  Switch,
} from "antd";
import {SearchOutlined, FilterOutlined, CloseOutlined, HeartFilled} from "@ant-design/icons";
import MainLayout from "../../components/layout/MainLayout";
import EventCard from "../../components/events/EventCard";
import useEventStore from "../../store/eventStore";
import { useTranslation } from "../../hooks/useTranslation";
import dayjs from "dayjs";

const {Title, Text} = Typography;
const {Option} = Select;
const {RangePicker} = DatePicker;

const EventListPage = () => {
  const [searchParams] = useSearchParams();
  const {
    events,
    total,
    totalPages,
    isLoading,
    categories,
    venues,
    fetchEvents,
    fetchMeta,
  } = useEventStore();
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    categoryId: searchParams.get("categoryId") || "",
    venueId: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 6,
    sortBy: "StartDate",
    sortOrder: "ASC",
    status: "Published",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showFavs, setShowFavs] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    const params = {...filters};
    Object.keys(params).forEach((k) => !params[k] && delete params[k]);
    params.status = "Published";
    fetchEvents(params);
  }, [filters]);

  const updateFilter = (key, value) =>
    setFilters((f) => ({...f, [key]: value, page: 1}));
  const clearFilters = () =>
    setFilters((f) => ({
      ...f,
      search: "",
      categoryId: "",
      venueId: "",
      startDate: "",
      endDate: "",
      page: 1,
    }));
  const hasFilters =
    filters.search ||
    filters.categoryId ||
    filters.venueId ||
    filters.startDate;

  const FilterPanel = () => (
    <div style={{display: "flex", flexDirection: "column", gap: 16}}>
      <div>
        <Text
          strong
          style={{
            display: "block",
            marginBottom: 8,
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
            color: "inherit"
          }}
        >
          {t('browse.category')}
        </Text>
        <Select
          value={filters.categoryId || undefined}
          onChange={(v) => updateFilter("categoryId", v || "")}
          placeholder={t('browse.allCategories')}
          style={{width: "100%"}}
          dropdownStyle={{fontFamily: "'Inter', sans-serif"}}
          className="category-filter"
          allowClear
        >
          {categories.map((c) => (
            <Option key={c.CategoryID} value={String(c.CategoryID)}>
              {t(`categories.${c.Name}`) !== `categories.${c.Name}` ? t(`categories.${c.Name}`) : c.Name}
            </Option>
          ))}
        </Select>
      </div>
      <div>
        <Text strong style={{display: "block", marginBottom: 8, fontSize: 13, color: "inherit"}}>
          {t('browse.venue')}
        </Text>
        <Select
          value={filters.venueId || undefined}
          onChange={(v) => updateFilter("venueId", v || "")}
          placeholder={t('browse.allVenues')}
          style={{width: "100%"}}
          allowClear
        >
          {venues.map((v) => (
            <Option key={v.VenueID} value={String(v.VenueID)}>
              {v.Name}
            </Option>
          ))}
        </Select>
      </div>
      <div>
        <Text strong style={{display: "block", marginBottom: 8, fontSize: 13, color: "inherit"}}>
          {t('browse.time')}
        </Text>
        <RangePicker
          style={{width: "100%"}}
          format="DD/MM/YYYY"
          onChange={(dates) => {
            setFilters((f) => ({
              ...f,
              startDate: dates?.[0]?.toISOString() || "",
              endDate: dates?.[1]?.toISOString() || "",
              page: 1,
            }));
          }}
        />
      </div>
      <div>
        <Text strong style={{display: "block", marginBottom: 8, fontSize: 13, color: "inherit"}}>
          {t('browse.sortBy')}
        </Text>
        <Select
          value={`${filters.sortBy}_${filters.sortOrder}`}
          onChange={(v) => {
            const [by, order] = v.split("_");
            setFilters((f) => ({...f, sortBy: by, sortOrder: order, page: 1}));
          }}
          style={{width: "100%"}}
        >
          <Option value="StartDate_ASC">{t('browse.sortDateAsc')}</Option>
          <Option value="StartDate_DESC">{t('browse.sortDateDesc')}</Option>
          <Option value="CreatedAt_DESC">{t('browse.sortNewest')}</Option>
          <Option value="Rating_DESC">{t('browse.sortRatingDesc')}</Option>
          <Option value="Title_ASC">{t('browse.sortNameAsc')}</Option>
        </Select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#be123c', borderRadius: 8, border: '1px solid #9f1239', boxShadow: '0 4px 12px rgba(190,18,60,0.15)' }}>
        <Text strong style={{ fontSize: 13, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
          <HeartFilled style={{ color: '#fecdd3' }} /> {t('browse.favorites')}
        </Text>
        <Switch checked={showFavs} onChange={setShowFavs} style={{ background: showFavs ? '#fb7185' : 'rgba(255,255,255,0.3)' }} />
      </div>
      {hasFilters && (
        <Button onClick={clearFilters} icon={<CloseOutlined />} block>
          {t('browse.clearFilters')}
        </Button>
      )}
    </div>
  );

  const displayedEvents = showFavs ? events.filter(e => JSON.parse(localStorage.getItem('favoriteEvents') || '[]').includes(String(e.EventID))) : events;

  return (
    <MainLayout>
      {/* Hero bar */}
      <div
        style={{
          background: "linear-gradient(135deg,#0f1629,#1a2744)",
          padding: "40px 24px 32px",
        }}
      >
        <div style={{maxWidth: 1200, margin: "0 auto"}}>
          <Title
            level={2}
            style={{
              color: "white",
              fontFamily: "'Inter', sans-serif",
              margin: "0 0 20px",
            }}
          >
            🔍 {t('browse.title')}
          </Title>
          <div style={{display: "flex", gap: 12, maxWidth: 350}}>
            <Input.Search
              placeholder={t('browse.search')}
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({...f, search: e.target.value}))
              }
              onSearch={() => fetchEvents({...filters})}
              style={{flex: 1, borderRadius: 10}}
              allowClear
            />
          </div>

          {/* Active filters */}
          {hasFilters && (
            <div
              style={{display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap"}}
            >
              {filters.categoryId && (
                <Tag
                  closable
                  onClose={() => updateFilter("categoryId", "")}
                  color="blue"
                >
                  {(() => {
                    const c = categories.find((c) => String(c.CategoryID) === filters.categoryId);
                    return c ? (t(`categories.${c.Name}`) !== `categories.${c.Name}` ? t(`categories.${c.Name}`) : c.Name) : "";
                  })()}
                </Tag>
              )}
              {filters.venueId && (
                <Tag
                  closable
                  onClose={() => updateFilter("venueId", "")}
                  color="purple"
                >
                  {
                    venues.find((v) => String(v.VenueID) === filters.venueId)
                      ?.Name
                  }
                </Tag>
              )}
              {filters.startDate && (
                <Tag
                  closable
                  onClose={() =>
                    setFilters((f) => ({
                      ...f,
                      startDate: "",
                      endDate: "",
                      page: 1,
                    }))
                  }
                  color="cyan"
                >
                  {filters.startDate && filters.endDate 
                    ? `${dayjs(filters.startDate).format("DD/MM/YYYY")} - ${dayjs(filters.endDate).format("DD/MM/YYYY")}`
                    : t('browse.byDate')}
                </Tag>
              )}
            </div>
          )}
        </div>
        <style>{`
          .category-filter .ant-select-selector {
            background-color: #f0fdf4 !important;
            border-color: #22c55e !important;
            border-width: 2px !important;
            color: #166534 !important;
            font-weight: 600;
          }
          .category-filter .ant-select-selection-placeholder {
            color: #166534 !important;
            opacity: 0.7;
          }
          body {
            font-family: 'DM Sans', sans-serif !important;
          }
        `}</style>
      </div>

      {/* Main content */}
      <div
        style={{maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px"}}
      >
        <Row gutter={[24, 24]}>
          {/* Sidebar filter — desktop */}
          <Col xs={0} lg={6}>
            <div
              className="sticky-panel-box"
              style={{
                background: "white",
                borderRadius: 14,
                padding: 20,
                border: "1px solid #e5e7eb",
                position: "sticky",
                top: 80,
              }}
            >
              <Text
                strong
                style={{fontSize: 15, fontFamily: "'Inter', sans-serif"}}
              >
                {t('browse.filterTitle')}
              </Text>
              <div style={{marginTop: 16}}>
                <FilterPanel />
              </div>
            </div>
          </Col>

          {/* Events grid */}
          <Col xs={24} lg={18}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              {filters.search && (
                <Text type="secondary">
                  {isLoading ? "..." : `${total} ${t('browse.eventsFound')}`}
                </Text>
              )}
            </div>

            {isLoading ? (
              <div style={{textAlign: "center", padding: 80}}>
                <Spin size="large" />
              </div>
            ) : displayedEvents.length === 0 ? (
              <Empty
                description={t('browse.noEvents')}
                style={{padding: 60}}
              />
            ) : (
              <>
                <Row gutter={[16, 16]}>
                  {displayedEvents.map((event) => (
                    <Col key={event.EventID} xs={24} sm={12} xl={8}>
                      <EventCard event={event} />
                    </Col>
                  ))}
                </Row>
                <div style={{textAlign: "center", marginTop: 32}}>
                  <Pagination
                    current={filters.page}
                    total={total}
                    pageSize={filters.limit}
                    onChange={(page) => setFilters((f) => ({...f, page}))}
                    showSizeChanger={false}
                  />
                </div>
              </>
            )}
          </Col>
        </Row>
      </div>

      {/* Mobile filter drawer */}
      <Drawer
        title={t('browse.filterTitle')}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="right"
        width={300}
        footer={
          <Button type="primary" block onClick={() => setDrawerOpen(false)}>
            {t('browse.apply')}
          </Button>
        }
      >
        <FilterPanel />
      </Drawer>
    </MainLayout>
  );
};

export default EventListPage;
