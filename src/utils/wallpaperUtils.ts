export type OnlineWallpaperItem = {
  id: string
  name: string
  source: string
  url: string
}

export function getOnlineWallpapers(bingWallpaper: string, refreshKey: number): OnlineWallpaperItem[] {
  const presets = [
    {
      id: 'u1',
      name: '自然海滩',
      source: 'Unsplash 自然',
      photos: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1920&q=80',
      ],
    },
    {
      id: 'u2',
      name: '雪山日落',
      source: 'Unsplash 风景',
      photos: [
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1920&q=80',
      ],
    },
    {
      id: 'u3',
      name: '晨曦森林',
      source: 'Unsplash 森林',
      photos: [
        'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1511497584788-8767611136f6?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80',
      ],
    },
    {
      id: 'u4',
      name: '赛博霓虹',
      source: 'Unsplash 城市',
      photos: [
        'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
      ],
    },
    {
      id: 'u5',
      name: '浩瀚星空',
      source: 'Unsplash 宇宙',
      photos: [
        'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=1920&q=80',
      ],
    },
    {
      id: 'u6',
      name: '极简建筑',
      source: 'Unsplash 建筑',
      photos: [
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80',
        'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1920&q=80',
      ],
    },
    {
      id: 'picsum',
      name: '随机摄影',
      source: 'Lorem Picsum',
      photos: [
        `https://picsum.photos/1920/1080?random=${refreshKey * 10 + 1}`,
        `https://picsum.photos/1920/1080?random=${refreshKey * 10 + 2}`,
        `https://picsum.photos/1920/1080?random=${refreshKey * 10 + 3}`,
        `https://picsum.photos/1920/1080?random=${refreshKey * 10 + 4}`,
      ],
    },
    {
      id: 'pexels_1',
      name: 'Pexels 极光风光',
      source: 'Pexels 高清',
      photos: [
        'https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/268533/pexels-photo-268533.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
    },
    {
      id: 'nasa_1',
      name: 'NASA 深空探索',
      source: 'NASA 宇宙',
      photos: [
        'https://images-assets.nasa.gov/image/PIA12348/PIA12348~orig.jpg',
        'https://images-assets.nasa.gov/image/gsfc_20171208_archive_e001427/gsfc_20171208_archive_e001427~orig.jpg',
        'https://images-assets.nasa.gov/image/PIA17563/PIA17563~orig.jpg',
        'https://images-assets.nasa.gov/image/hubble-sees-a-star-studded-sky_18212130384_o/hubble-sees-a-star-studded-sky_18212130384_o~orig.jpg',
      ],
    },
    {
      id: 'wikimedia_1',
      name: '维基环球地理',
      source: 'Wikimedia',
      photos: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Altja_j%C3%B5gi_Lahemaal.jpg/1920px-Altja_j%C3%B5gi_Lahemaal.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/20130810_K%C3%B6nigsee_vom_Malerwinkel_02.jpg/1920px-20130810_K%C3%B6nigsee_vom_Malerwinkel_02.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Northern_Lights_over_Eyjafjallaj%C3%B6kull_2010.jpg/1920px-Northern_Lights_over_Eyjafjallaj%C3%B6kull_2010.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Crater_Lake_national_park_2.jpg/1920px-Crater_Lake_national_park_2.jpg',
      ],
    },
  ]

  const items: OnlineWallpaperItem[] = [
    { id: 'bing', name: 'Bing 每日壁纸', source: 'Bing', url: bingWallpaper },
    ...presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      source: preset.source,
      url: preset.photos[refreshKey % preset.photos.length]!,
    })),
  ]

  return items
}
