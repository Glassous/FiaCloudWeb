export const ossRegions = [
  { label: '华东1 (杭州)', value: 'oss-cn-hangzhou' },
  { label: '华东2 (上海)', value: 'oss-cn-shanghai' },
  { label: '华北1 (青岛)', value: 'oss-cn-qingdao' },
  { label: '华北2 (北京)', value: 'oss-cn-beijing' },
  { label: '华北3 (张家口)', value: 'oss-cn-zhangjiakou' },
  { label: '华北5 (呼和浩特)', value: 'oss-cn-huhehaote' },
  { label: '华北6 (乌兰察布)', value: 'oss-cn-wulanchabu' },
  { label: '华南1 (深圳)', value: 'oss-cn-shenzhen' },
  { label: '华南2 (河源)', value: 'oss-cn-heyuan' },
  { label: '华南3 (广州)', value: 'oss-cn-guangzhou' },
  { label: '西南1 (成都)', value: 'oss-cn-chengdu' },
  { label: '中国香港', value: 'oss-cn-hongkong' },
  { label: '新加坡', value: 'oss-ap-southeast-1' },
  { label: '澳大利亚 (悉尼)', value: 'oss-ap-southeast-2' },
  { label: '马来西亚 (吉隆坡)', value: 'oss-ap-southeast-3' },
  { label: '印度尼西亚 (雅加达)', value: 'oss-ap-southeast-5' },
  { label: '日本 (东京)', value: 'oss-ap-northeast-1' },
  { label: '美国 (硅谷)', value: 'oss-us-west-1' },
  { label: '美国 (弗吉尼亚)', value: 'oss-us-east-1' },
  { label: '德国 (法兰克福)', value: 'oss-eu-central-1' },
  { label: '英国 (伦敦)', value: 'oss-eu-west-1' },
  { label: '阿联酋 (迪拜)', value: 'oss-me-east-1' },
];

export const getEndpoint = (region: string) => {
  return `${region}.aliyuncs.com`;
};
