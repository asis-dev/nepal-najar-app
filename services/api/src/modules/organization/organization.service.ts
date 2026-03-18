import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, IsNull } from 'typeorm';
import { GovernmentUnit } from '../../entities/government-unit.entity';
import { GovernmentUnitMember } from '../../entities/government-unit-member.entity';
import { CreateGovernmentUnitDto } from './dto/create-government-unit.dto';
import { UpdateGovernmentUnitDto } from './dto/update-government-unit.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { PaginatedResponse } from '../../common/dto/pagination.dto';

export interface GovernmentUnitFilters {
  type?: string;
  parentId?: string;
  regionId?: string;
  page?: number;
  limit?: number;
}

export interface HierarchyNode extends GovernmentUnit {
  children: HierarchyNode[];
}

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(GovernmentUnit)
    private readonly unitRepo: Repository<GovernmentUnit>,

    @InjectRepository(GovernmentUnitMember)
    private readonly memberRepo: Repository<GovernmentUnitMember>,
  ) {}

  async findAll(filters: GovernmentUnitFilters = {}): Promise<PaginatedResponse<GovernmentUnit>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<GovernmentUnit> = {};
    if (filters.type) where.type = filters.type;
    if (filters.parentId) where.parent_id = filters.parentId;
    if (filters.regionId) where.region_id = filters.regionId;

    const [data, total] = await this.unitRepo.findAndCount({
      where,
      relations: ['parent', 'region'],
      order: { name: 'ASC' },
      skip,
      take: limit,
    });

    return new PaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<GovernmentUnit> {
    const unit = await this.unitRepo.findOne({
      where: { id },
      relations: ['parent', 'children', 'region'],
    });
    if (!unit) {
      throw new NotFoundException(`Government unit ${id} not found`);
    }
    return unit;
  }

  async create(dto: CreateGovernmentUnitDto): Promise<GovernmentUnit> {
    if (dto.parent_id) {
      const parentExists = await this.unitRepo.findOne({ where: { id: dto.parent_id } });
      if (!parentExists) {
        throw new NotFoundException(`Parent unit ${dto.parent_id} not found`);
      }
    }

    const unit = this.unitRepo.create(dto);
    return this.unitRepo.save(unit);
  }

  async update(id: string, dto: UpdateGovernmentUnitDto): Promise<GovernmentUnit> {
    const unit = await this.findOne(id);

    if (dto.parent_id !== undefined && dto.parent_id !== null) {
      if (dto.parent_id === id) {
        throw new ConflictException('A unit cannot be its own parent');
      }
      const parentExists = await this.unitRepo.findOne({ where: { id: dto.parent_id } });
      if (!parentExists) {
        throw new NotFoundException(`Parent unit ${dto.parent_id} not found`);
      }
      // Prevent circular hierarchy
      const descendantIds = await this.getDescendantIds(id);
      if (descendantIds.includes(dto.parent_id)) {
        throw new ConflictException('Cannot set a descendant as parent (circular reference)');
      }
    }

    Object.assign(unit, dto);
    return this.unitRepo.save(unit);
  }

  async getHierarchyTree(): Promise<HierarchyNode[]> {
    const allUnits = await this.unitRepo.find({
      relations: ['region'],
      order: { name: 'ASC' },
    });

    const map = new Map<string, HierarchyNode>();
    const roots: HierarchyNode[] = [];

    // First pass: index all units
    for (const unit of allUnits) {
      map.set(unit.id, { ...unit, children: [] } as HierarchyNode);
    }

    // Second pass: build tree
    for (const node of map.values()) {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async findMembers(unitId: string): Promise<GovernmentUnitMember[]> {
    await this.findOne(unitId); // ensure unit exists
    return this.memberRepo.find({
      where: { government_unit_id: unitId },
      relations: ['user'],
      order: { is_primary: 'DESC', created_at: 'ASC' },
    });
  }

  async addMember(unitId: string, dto: AddMemberDto): Promise<GovernmentUnitMember> {
    await this.findOne(unitId); // ensure unit exists

    const existing = await this.memberRepo.findOne({
      where: { government_unit_id: unitId, user_id: dto.user_id },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this unit');
    }

    const member = this.memberRepo.create({
      government_unit_id: unitId,
      user_id: dto.user_id,
      title: dto.title ?? null,
      is_primary: dto.is_primary ?? false,
    });
    return this.memberRepo.save(member);
  }

  async removeMember(unitId: string, memberId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, government_unit_id: unitId },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in unit ${unitId}`);
    }
    await this.memberRepo.remove(member);
  }

  async getDescendantIds(unitId: string): Promise<string[]> {
    const ids: string[] = [];
    const queue: string[] = [unitId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.unitRepo.find({
        where: { parent_id: currentId },
        select: ['id'],
      });
      for (const child of children) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }

    return ids;
  }
}
